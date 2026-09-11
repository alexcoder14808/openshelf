import { useEffect, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw, RotateCw,
  Volume2, Volume1, VolumeX, Gauge, Bookmark, BookmarkCheck,
  ListMusic, Moon, Maximize2, Minimize2, Trash2,
} from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { getChapterLabel } from '../../utils/chapterTitle';
import { formatTime } from '../../utils/formatTime';
import ProgressBar from './ProgressBar';
import SlidePanel from './SlidePanel';
import './AudioPlayer.css';

const SLEEP_PRESETS = [15, 30, 45, 60];

export default function AudioPlayer() {
  const {
    book, tracks, currentTrack, currentTrackIndex,
    playing, currentTime, duration, volume, muted, speed, speeds,
    bookmarks, sleepTimerEndsAt, loadError,
    togglePlay, seekTo, rewind15, forward30,
    nextChapter, previousChapter, goToTrackIndex,
    changeSpeed, changeVolume, toggleMute,
    addBookmark, removeBookmark, jumpToBookmark,
    setSleepTimer, cancelSleepTimer,
  } = useAudioPlayer();

  const [openPanel, setOpenPanel] = useState(null); // 'chapters' | 'bookmarks' | 'sleep' | 'speed' | 'volume' | null
  const [fullscreen, setFullscreen] = useState(false);
  const [justBookmarked, setJustBookmarked] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');

  const closePanel = () => setOpenPanel(null);

  // Keyboard shortcuts — ignored while typing in form fields.
  useEffect(() => {
    function isTypingTarget(el) {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    }
    function handleKeyDown(e) {
      if (isTypingTarget(document.activeElement)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        rewind15();
      } else if (e.code === 'ArrowRight') {
        forward30();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, rewind15, forward30]);

  if (!book || !currentTrack) {
    return (
      <div className="audio-player audio-player--empty">
        <p>{loadError || 'No audiobook loaded.'}</p>
      </div>
    );
  }

  const chapterLabel = getChapterLabel(currentTrack, currentTrackIndex);
  const isFirstChapter = currentTrackIndex <= 0;
  const isLastChapter = currentTrackIndex >= tracks.length - 1;

  const handleBookmarkClick = () => {
    addBookmark();
    setJustBookmarked(true);
    window.setTimeout(() => setJustBookmarked(false), 1400);
  };

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const sleepMinutesRemaining = sleepTimerEndsAt
    ? Math.max(0, Math.ceil((sleepTimerEndsAt - Date.now()) / 60000))
    : null;

  return (
    <div className={`audio-player ${fullscreen ? 'audio-player--fullscreen' : ''}`}>
      <div className="audio-player-card">
        <button
          className="audio-player-fullscreen-toggle"
          onClick={() => setFullscreen((f) => !f)}
          aria-label={fullscreen ? 'Exit fullscreen player' : 'Open fullscreen player'}
        >
          {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        <div className="audio-player-cover-wrap">
          {book.cover_url ? (
            <img className="audio-player-cover" src={book.cover_url} alt="" />
          ) : (
            <div className="audio-player-cover audio-player-cover--placeholder">{book.title?.[0] || '?'}</div>
          )}
        </div>

        <div className="audio-player-meta">
          <h2 className="audio-player-title">{book.title}</h2>
          <p className="audio-player-author">{book.author}</p>
          <p className="audio-player-chapter">
            {chapterLabel} <span className="audio-player-chapter-index">· Chapter {currentTrackIndex + 1} of {tracks.length}</span>
          </p>
        </div>

        {loadError && <p className="audio-player-error">{loadError}</p>}

        <div className="audio-player-progress-row">
          <span className="audio-player-time">{formatTime(currentTime)}</span>
          <ProgressBar currentTime={currentTime} duration={duration} onSeek={seekTo} />
          <span className="audio-player-time">{formatTime(duration)}</span>
        </div>

        <div className="audio-player-transport">
          <button className="transport-btn" onClick={previousChapter} disabled={tracks.length <= 1} aria-label="Previous chapter">
            <SkipBack size={22} />
          </button>
          <button className="transport-btn" onClick={rewind15} aria-label="Rewind 15 seconds">
            <span className="transport-btn-icon-wrap">
              <RotateCcw size={22} />
              <span className="transport-btn-badge">15</span>
            </span>
          </button>
          <button className="transport-btn transport-btn--play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={28} /> : <Play size={28} />}
          </button>
          <button className="transport-btn" onClick={forward30} aria-label="Forward 30 seconds">
            <span className="transport-btn-icon-wrap">
              <RotateCw size={22} />
              <span className="transport-btn-badge">30</span>
            </span>
          </button>
          <button className="transport-btn" onClick={nextChapter} disabled={isLastChapter} aria-label="Next chapter">
            <SkipForward size={22} />
          </button>
        </div>

        <div className="audio-player-toolbar">
          <button className="toolbar-btn" onClick={() => setOpenPanel('speed')} aria-label="Playback speed">
            <Gauge size={18} /> <span>{speed}x</span>
          </button>
          <button className="toolbar-btn" onClick={() => setOpenPanel('volume')} aria-label="Volume">
            <VolumeIcon size={18} />
          </button>
          <button
            className={`toolbar-btn ${justBookmarked ? 'toolbar-btn--active' : ''}`}
            onClick={handleBookmarkClick}
            aria-label="Add bookmark"
          >
            {justBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
          <button className="toolbar-btn" onClick={() => setOpenPanel('bookmarks')} aria-label="View bookmarks">
            <ListMusic size={18} /> <span>Bookmarks</span>
          </button>
          <button className="toolbar-btn" onClick={() => setOpenPanel('sleep')} aria-label="Sleep timer">
            <Moon size={18} /> {sleepMinutesRemaining !== null && <span>{sleepMinutesRemaining}m</span>}
          </button>
          <button className="toolbar-btn" onClick={() => setOpenPanel('chapters')} aria-label="Chapters">
            <ListMusic size={18} /> <span>Chapters</span>
          </button>
        </div>
      </div>

      {/* ---------------- Chapters panel ---------------- */}
      <SlidePanel open={openPanel === 'chapters'} title="Chapters" onClose={closePanel}>
        <ul className="panel-list">
          {tracks.map((track, index) => (
            <li key={track.id}>
              <button
                className={`panel-list-item ${index === currentTrackIndex ? 'panel-list-item--active' : ''}`}
                onClick={() => {
                  goToTrackIndex(index, { autoplay: true });
                  closePanel();
                }}
              >
                <span>{getChapterLabel(track, index)}</span>
                {index === currentTrackIndex && <span className="panel-list-item-tag">Playing</span>}
              </button>
            </li>
          ))}
        </ul>
      </SlidePanel>

      {/* ---------------- Bookmarks panel ---------------- */}
      <SlidePanel open={openPanel === 'bookmarks'} title="Bookmarks" onClose={closePanel}>
        {bookmarks.length === 0 ? (
          <p className="panel-empty">No bookmarks yet. Tap the bookmark icon while listening to save your place.</p>
        ) : (
          <ul className="panel-list">
            {bookmarks.map((bm) => (
              <li key={bm.id} className="panel-list-row">
                <button
                  className="panel-list-item"
                  onClick={() => {
                    jumpToBookmark(bm);
                    closePanel();
                  }}
                >
                  <span>{bm.chapterLabel}</span>
                  <span className="panel-list-item-tag">{formatTime(bm.time)}</span>
                </button>
                <button className="panel-list-delete" onClick={() => removeBookmark(bm.id)} aria-label="Delete bookmark">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SlidePanel>

      {/* ---------------- Sleep timer panel ---------------- */}
      <SlidePanel open={openPanel === 'sleep'} title="Sleep Timer" onClose={closePanel}>
        <div className="panel-chip-row">
          {SLEEP_PRESETS.map((mins) => (
            <button key={mins} className="panel-chip" onClick={() => { setSleepTimer(mins); closePanel(); }}>
              {mins} min
            </button>
          ))}
        </div>
        <div className="panel-custom-row">
          <input
            type="number"
            min="1"
            placeholder="Custom minutes"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            className="panel-input"
          />
          <button
            className="panel-chip"
            onClick={() => {
              const mins = Number(customMinutes);
              if (mins > 0) {
                setSleepTimer(mins);
                setCustomMinutes('');
                closePanel();
              }
            }}
          >
            Set
          </button>
        </div>
        {sleepMinutesRemaining !== null && (
          <div className="panel-timer-status">
            <p>Sleeping in {sleepMinutesRemaining} min</p>
            <button className="panel-chip panel-chip--danger" onClick={() => { cancelSleepTimer(); closePanel(); }}>
              Cancel timer
            </button>
          </div>
        )}
      </SlidePanel>

      {/* ---------------- Speed panel ---------------- */}
      <SlidePanel open={openPanel === 'speed'} title="Playback Speed" onClose={closePanel}>
        <div className="panel-chip-row">
          {speeds.map((s) => (
            <button
              key={s}
              className={`panel-chip ${s === speed ? 'panel-chip--active' : ''}`}
              onClick={() => { changeSpeed(s); closePanel(); }}
            >
              {s}x
            </button>
          ))}
        </div>
      </SlidePanel>

      {/* ---------------- Volume panel ---------------- */}
      <SlidePanel open={openPanel === 'volume'} title="Volume" onClose={closePanel}>
        <div className="panel-volume-row">
          <button className="toolbar-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
            <VolumeIcon size={20} />
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={muted ? 0 : Math.round(volume * 100)}
            onChange={(e) => changeVolume(Number(e.target.value) / 100)}
            className="panel-volume-slider"
            aria-label="Volume level"
          />
          <span className="panel-volume-value">{muted ? 0 : Math.round(volume * 100)}%</span>
        </div>
      </SlidePanel>
    </div>
  );
}
