import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, RotateCw, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { getChapterLabel } from '../../utils/chapterTitle';
import { formatTime } from '../../utils/formatTime';
import ProgressBar from './ProgressBar';
import './MiniPlayer.css';

const AUTO_HIDE_MS = 60 * 1000; // hide 1 minute after playback pauses

export default function MiniPlayer() {
  const {
    book, currentTrack, currentTrackIndex, tracks,
    playing, currentTime, duration,
    togglePlay, seekTo, nextChapter, previousChapter, rewind15, forward30,
  } = useAudioPlayer();
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const hideTimerRef = useRef(null);
  const dragStartYRef = useRef(null);
  const dragDeltaRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Show immediately whenever a book is loaded or playback resumes; after a
  // pause, wait a minute of continued silence before sliding away — long
  // enough that a quick pause to talk to someone doesn't yank the UI.
  useEffect(() => {
    if (!book) return;
    if (playing) {
      setHidden(false);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      return;
    }
    hideTimerRef.current = setTimeout(() => setHidden(true), AUTO_HIDE_MS);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [playing, book]);

  // A fresh book (or resuming play) should always be visible again.
  useEffect(() => {
    if (book) setHidden(false);
  }, [book?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragStart = (clientY) => {
    dragStartYRef.current = clientY;
    dragDeltaRef.current = 0;
  };
  const handleDragMove = (clientY) => {
    if (dragStartYRef.current === null) return;
    const delta = clientY - dragStartYRef.current;
    dragDeltaRef.current = delta;
    setDragOffset(delta);
  };
  const handleDragEnd = () => {
    const delta = dragDeltaRef.current;
    dragStartYRef.current = null;
    setDragOffset(0);
    if (delta < -30) setExpanded(true);
    else if (delta > 30) setExpanded(false);
  };

  if (!book || !currentTrack) return null;

  const chapterLabel = getChapterLabel(currentTrack, currentTrackIndex);

  return (
    <div
      className={`mini-player ${expanded ? 'mini-player--expanded' : ''} ${hidden ? 'mini-player--hidden' : ''}`}
    >
      <div
        className="mini-player-handle"
        onClick={() => setExpanded((e) => !e)}
        onMouseDown={(e) => handleDragStart(e.clientY)}
        onMouseMove={(e) => e.buttons === 1 && handleDragMove(e.clientY)}
        onMouseUp={handleDragEnd}
        onMouseLeave={() => dragStartYRef.current !== null && handleDragEnd()}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
        style={{ transform: dragOffset ? `translateY(${Math.max(Math.min(dragOffset, 40), -40)}px)` : undefined }}
      >
        <div className="mini-player-grip" />
        {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </div>

      <div className="mini-player-progress">
        <ProgressBar currentTime={currentTime} duration={duration} onSeek={seekTo} size="mini" />
      </div>

      {expanded && (
        <div className="mini-player-expanded-body">
          {book.cover_url ? (
            <img className="mini-player-expanded-cover" src={book.cover_url} alt="" />
          ) : (
            <div className="mini-player-expanded-cover mini-player-expanded-cover--placeholder">{book.title?.[0]}</div>
          )}
          <p className="mini-player-expanded-title">{book.title}</p>
          <p className="mini-player-expanded-chapter">{chapterLabel}</p>
          <div className="mini-player-expanded-time">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="mini-player-expanded-controls">
            <button className="mini-player-btn" onClick={previousChapter} disabled={tracks.length <= 1} aria-label="Previous chapter">
              <SkipBack size={20} />
            </button>
            <button className="mini-player-btn" onClick={rewind15} aria-label="Rewind 15 seconds">
              <RotateCcw size={20} />
            </button>
            <button className="mini-player-btn mini-player-btn--play mini-player-btn--big" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause size={26} /> : <Play size={26} />}
            </button>
            <button className="mini-player-btn" onClick={forward30} aria-label="Forward 30 seconds">
              <RotateCw size={20} />
            </button>
            <button className="mini-player-btn" onClick={nextChapter} disabled={currentTrackIndex >= tracks.length - 1} aria-label="Next chapter">
              <SkipForward size={20} />
            </button>
          </div>
          <button
            className="mini-player-open-full"
            onClick={() => {
              setExpanded(false);
              navigate(`/listen/${book.id}`);
            }}
          >
            Open full player
          </button>
        </div>
      )}

      {!expanded && (
        <div className="mini-player-body">
          <button
            className="mini-player-info"
            onClick={() => navigate(`/listen/${book.id}`)}
            aria-label="Open full player"
          >
            {book.cover_url ? (
              <img className="mini-player-cover" src={book.cover_url} alt="" />
            ) : (
              <div className="mini-player-cover mini-player-cover--placeholder">{book.title?.[0] || '?'}</div>
            )}
            <div className="mini-player-text">
              <span className="mini-player-title">{book.title}</span>
              <span className="mini-player-chapter">{chapterLabel}</span>
            </div>
          </button>

          <div className="mini-player-time">
            <span>{formatTime(currentTime)}</span>
            <span className="mini-player-time-sep">/</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="mini-player-controls">
            <button className="mini-player-btn" onClick={previousChapter} disabled={tracks.length <= 1} aria-label="Previous chapter">
              <SkipBack size={18} />
            </button>
            <button className="mini-player-btn mini-player-btn--play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button className="mini-player-btn" onClick={nextChapter} disabled={currentTrackIndex >= tracks.length - 1} aria-label="Next chapter">
              <SkipForward size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
