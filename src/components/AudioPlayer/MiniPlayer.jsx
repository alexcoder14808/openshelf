import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { getChapterLabel } from '../../utils/chapterTitle';
import { formatTime } from '../../utils/formatTime';
import ProgressBar from './ProgressBar';
import './MiniPlayer.css';

export default function MiniPlayer() {
  const {
    book, currentTrack, currentTrackIndex, tracks,
    playing, currentTime, duration,
    togglePlay, seekTo, nextChapter, previousChapter, stopAndUnload,
  } = useAudioPlayer();
  const navigate = useNavigate();

  if (!book || !currentTrack) return null;

  const chapterLabel = getChapterLabel(currentTrack, currentTrackIndex);

  return (
    <div className="mini-player">
      <div className="mini-player-progress">
        <ProgressBar currentTime={currentTime} duration={duration} onSeek={seekTo} size="mini" />
      </div>

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
          <button className="mini-player-btn mini-player-btn--close" onClick={stopAndUnload} aria-label="Close player">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
