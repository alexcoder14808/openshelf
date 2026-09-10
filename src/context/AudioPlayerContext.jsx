import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getAudioUrl, getChapterLabel } from '../utils/chapterTitle';

const AudioPlayerContext = createContext(null);

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const PROGRESS_KEY = (trackId) => `openshelf-progress-${trackId}`;
const BOOKMARKS_KEY = 'openshelf-bookmarks';

function loadBookmarksFromStorage() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarksToStorage(bookmarks) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch (err) {
    console.error('Failed to persist bookmarks:', err);
  }
}

function loadSavedPosition(trackId) {
  if (!trackId) return 0;
  const raw = localStorage.getItem(PROGRESS_KEY(trackId));
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function savePosition(trackId, seconds) {
  if (!trackId) return;
  try {
    localStorage.setItem(PROGRESS_KEY(trackId), String(Math.floor(seconds)));
  } catch (err) {
    console.error('Failed to save progress:', err);
  }
}

export function AudioPlayerProvider({ children }) {
  // The ONE global audio element for the whole app.
  const audioRef = useRef(null);
  if (!audioRef.current && typeof window !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
  }

  const [book, setBook] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [bookmarks, setBookmarks] = useState(loadBookmarksFromStorage);
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Guards against race conditions when rapidly switching chapters — every
  // load gets a token; only the most recent token is allowed to commit state.
  const loadTokenRef = useRef(0);
  const sleepTimerRef = useRef(null);
  const progressSaveIntervalRef = useRef(null);

  const currentTrack = tracks[currentTrackIndex] || null;

  // ---------------- Core audio element wiring (mounted once) ----------------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);

    const onLoadedMetadata = () => {
      const d = audio.duration;
      setDuration(Number.isFinite(d) ? d : 0);
      setIsLoaded(true);
    };

    const onDurationChange = () => {
      const d = audio.duration;
      setDuration(Number.isFinite(d) ? d : 0);
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    const onEnded = () => {
      // Handled via a ref-based callback so we always call the LATEST
      // "go to next chapter" logic without re-binding this listener.
      advanceToNextRef.current?.();
    };

    const onError = () => {
      console.error('Audio playback error for track:', currentTrackRef.current?.id);
      setLoadError('This chapter could not be loaded.');
      setPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []); // mounted exactly once — this element lives for the app's lifetime

  // Refs that let stable listeners above see fresh values without rebinding.
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const advanceToNextRef = useRef(null);

  // ---------------- Periodic progress persistence ----------------
  useEffect(() => {
    progressSaveIntervalRef.current = window.setInterval(() => {
      const audio = audioRef.current;
      const track = currentTrackRef.current;
      if (audio && track && !audio.paused) {
        savePosition(track.id, audio.currentTime);
      }
    }, 5000);
    return () => window.clearInterval(progressSaveIntervalRef.current);
  }, []);

  // ---------------- Load a specific track into the shared element ----------------
  const loadTrack = useCallback(async (track, { autoplay = false, resumeSeconds = null } = {}) => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    const myToken = ++loadTokenRef.current;
    setLoadError(null);
    setIsLoaded(false);

    const url = getAudioUrl(track);
    if (!url) {
      setLoadError('This chapter has no audio source.');
      return;
    }

    audio.pause();
    audio.src = url;
    audio.playbackRate = speed;
    audio.volume = muted ? 0 : volume;

    const targetSeconds = resumeSeconds !== null ? resumeSeconds : loadSavedPosition(track.id);

    const onceLoaded = () => {
      if (loadTokenRef.current !== myToken) return; // a newer load superseded us
      if (targetSeconds > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(targetSeconds, Math.max(audio.duration - 0.5, 0));
      } else if (targetSeconds > 0) {
        audio.currentTime = targetSeconds;
      }
      setCurrentTime(audio.currentTime || 0);
      if (autoplay) {
        audio.play().catch((err) => {
          // Autoplay can be blocked by the browser — this is expected and
          // should not be treated as a crash.
          console.warn('Autoplay was blocked:', err);
        });
      }
    };

    audio.addEventListener('loadedmetadata', onceLoaded, { once: true });
    audio.load();
  }, [speed, volume, muted]);

  // ---------------- Load a whole book + its tracks ----------------
  const loadBook = useCallback(
    async (bookRow, trackRows, { startTrackIndex = 0, autoplay = false } = {}) => {
      if (!trackRows || trackRows.length === 0) {
        console.error('loadBook called with an empty track list.');
        setLoadError('This audiobook has no chapters available.');
        return;
      }
      const sorted = [...trackRows].sort((a, b) => (a.track_number || 0) - (b.track_number || 0));
      const safeIndex = Math.min(Math.max(startTrackIndex, 0), sorted.length - 1);

      setBook(bookRow);
      setTracks(sorted);
      setCurrentTrackIndex(safeIndex);
      await loadTrack(sorted[safeIndex], { autoplay });
    },
    [loadTrack]
  );

  // ---------------- Chapter navigation ----------------
  const goToTrackIndex = useCallback(
    async (index, { autoplay = true } = {}) => {
      if (index < 0 || index >= tracks.length) {
        console.warn('goToTrackIndex: invalid index', index);
        return;
      }
      // Persist current position under the OLD track's own key before leaving.
      const audio = audioRef.current;
      const outgoing = tracks[currentTrackIndex];
      if (audio && outgoing) savePosition(outgoing.id, audio.currentTime);

      setCurrentTrackIndex(index);
      // A freshly-selected chapter uses ITS OWN saved resume position, never
      // the outgoing chapter's currentTime.
      await loadTrack(tracks[index], { autoplay, resumeSeconds: null });
    },
    [tracks, currentTrackIndex, loadTrack]
  );

  const nextChapter = useCallback(() => {
    if (currentTrackIndex >= tracks.length - 1) return; // already last — no-op, no crash
    goToTrackIndex(currentTrackIndex + 1, { autoplay: true });
  }, [currentTrackIndex, tracks.length, goToTrackIndex]);

  const previousChapter = useCallback(() => {
    if (currentTrackIndex <= 0) {
      // Restart chapter 1 at 0:00
      goToTrackIndex(0, { autoplay: true });
      return;
    }
    goToTrackIndex(currentTrackIndex - 1, { autoplay: true });
  }, [currentTrackIndex, goToTrackIndex]);

  // Keep the "ended" handler pointed at the latest nextChapter implementation.
  useEffect(() => {
    advanceToNextRef.current = () => {
      if (currentTrackIndex < tracks.length - 1) {
        goToTrackIndex(currentTrackIndex + 1, { autoplay: true });
      } else {
        setPlaying(false);
      }
    };
  }, [currentTrackIndex, tracks.length, goToTrackIndex]);

  // ---------------- Transport controls ----------------
  const play = useCallback(() => {
    audioRef.current?.play().catch((err) => console.warn('Play blocked:', err));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) play();
    else pause();
  }, [play, pause]);

  // Seeking ONLY sets currentTime. Never touches .src or .load().
  const seekTo = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    const safeDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    let target = Number.isFinite(seconds) ? seconds : 0;
    if (target < 0) target = 0;
    if (safeDuration > 0 && target > safeDuration) target = safeDuration - 0.05;
    audio.currentTime = target;
    setCurrentTime(target);
  }, []);

  const skip = useCallback(
    (deltaSeconds) => {
      const audio = audioRef.current;
      if (!audio) return;
      seekTo((audio.currentTime || 0) + deltaSeconds);
    },
    [seekTo]
  );

  const rewind15 = useCallback(() => skip(-15), [skip]);
  const forward30 = useCallback(() => skip(30), [skip]);

  // Speed change: playbackRate ONLY. Never touches src/currentTime/track.
  const changeSpeed = useCallback((newSpeed) => {
    const audio = audioRef.current;
    setSpeed(newSpeed);
    if (audio) audio.playbackRate = newSpeed;
  }, []);

  // Volume: independent of chapter/src.
  const changeVolume = useCallback((newVolume) => {
    const clamped = Math.min(Math.max(newVolume, 0), 1);
    setVolume(clamped);
    setMuted(clamped === 0);
    const audio = audioRef.current;
    if (audio) audio.volume = clamped;
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    setMuted((prevMuted) => {
      const next = !prevMuted;
      if (audio) audio.volume = next ? 0 : volume;
      return next;
    });
  }, [volume]);

  // ---------------- Bookmarks (ONLY created on explicit user action) ----------------
  const addBookmark = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !book || !currentTrack) return null;

    const time = audio.currentTime || 0;
    const bookmark = {
      id: `${book.id}-${currentTrack.id}-${Math.floor(time)}-${Date.now()}`,
      bookId: book.id,
      chapterId: currentTrack.id,
      chapterIndex: currentTrackIndex,
      chapterLabel: getChapterLabel(currentTrack, currentTrackIndex),
      time,
      createdAt: new Date().toISOString(),
    };

    setBookmarks((prev) => {
      // Avoid accidental exact-duplicate (same book/chapter/second).
      const exists = prev.some(
        (b) => b.bookId === bookmark.bookId && b.chapterId === bookmark.chapterId && Math.floor(b.time) === Math.floor(time)
      );
      const next = exists ? prev : [bookmark, ...prev];
      saveBookmarksToStorage(next);
      return next;
    });

    return bookmark;
  }, [book, currentTrack, currentTrackIndex]);

  const removeBookmark = useCallback((bookmarkId) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== bookmarkId);
      saveBookmarksToStorage(next);
      return next;
    });
  }, []);

  const jumpToBookmark = useCallback(
    async (bookmark) => {
      if (!bookmark) return;
      const targetIndex = tracks.findIndex((t) => t.id === bookmark.chapterId);
      if (targetIndex === -1) {
        console.warn('jumpToBookmark: chapter no longer exists in this track list.');
        return;
      }
      setCurrentTrackIndex(targetIndex);
      await loadTrack(tracks[targetIndex], { autoplay: true, resumeSeconds: bookmark.time });
    },
    [tracks, loadTrack]
  );

  const currentBookBookmarks = book ? bookmarks.filter((b) => b.bookId === book.id) : [];

  // ---------------- Sleep timer ----------------
  const setSleepTimer = useCallback((minutes) => {
    if (sleepTimerRef.current) {
      window.clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (!minutes || minutes <= 0) {
      setSleepTimerEndsAt(null);
      return;
    }
    const endsAt = Date.now() + minutes * 60 * 1000;
    setSleepTimerEndsAt(endsAt);
    sleepTimerRef.current = window.setTimeout(() => {
      audioRef.current?.pause();
      setSleepTimerEndsAt(null);
      sleepTimerRef.current = null;
    }, minutes * 60 * 1000);
  }, []);

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      window.clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimerEndsAt(null);
  }, []);

  // ---------------- Stop / unload entirely (e.g. mini player close button) ----------------
  const stopAndUnload = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setBook(null);
    setTracks([]);
    setCurrentTrackIndex(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoaded(false);
    cancelSleepTimer();
  }, [cancelSleepTimer]);

  // Optional Supabase fetch helper — components can also fetch themselves,
  // but this keeps the "load a book by id" logic in one place.
  const loadBookById = useCallback(
    async (bookId, opts) => {
      const { data: bookRow, error: bookErr } = await supabase.from('books').select('*').eq('id', bookId).single();
      if (bookErr) {
        console.error('Failed to load book:', bookErr);
        setLoadError('Could not load this audiobook.');
        return;
      }
      const { data: trackRows, error: trackErr } = await supabase
        .from('audiobook_tracks')
        .select('*')
        .eq('book_id', bookId)
        .order('track_number', { ascending: true });
      if (trackErr) {
        console.error('Failed to load tracks:', trackErr);
        setLoadError('Could not load chapters for this audiobook.');
        return;
      }
      await loadBook(bookRow, trackRows || [], opts);
    },
    [loadBook]
  );

  const value = {
    // state
    book,
    tracks,
    currentTrack,
    currentTrackIndex,
    playing,
    currentTime,
    duration,
    volume,
    muted,
    speed,
    speeds: SPEEDS,
    bookmarks: currentBookBookmarks,
    allBookmarks: bookmarks,
    sleepTimerEndsAt,
    loadError,
    isLoaded,
    hasActiveBook: !!book,

    // actions
    loadBook,
    loadBookById,
    goToTrackIndex,
    nextChapter,
    previousChapter,
    play,
    pause,
    togglePlay,
    seekTo,
    rewind15,
    forward30,
    changeSpeed,
    changeVolume,
    toggleMute,
    addBookmark,
    removeBookmark,
    jumpToBookmark,
    setSleepTimer,
    cancelSleepTimer,
    stopAndUnload,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}
