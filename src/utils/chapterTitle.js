// ============================================================
// SAFE CHAPTER TITLE HELPER
// ============================================================
// Rule: the UI must NEVER show a raw audio filename. This helper is the
// single source of truth for turning a track record into a human label.

const FILENAME_PATTERN = /\.(mp3|m4a|m4b|wav|aac|ogg|flac|webm)(\?.*)?$/i;
const LOOKS_LIKE_FILENAME_PATTERN = /^(chapter|track|audio|part|file)[\s_-]*\d+.*\.(mp3|m4a|m4b|wav|aac|ogg|flac|webm)$/i;

function looksLikeFilename(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (FILENAME_PATTERN.test(trimmed)) return true;
  if (LOOKS_LIKE_FILENAME_PATTERN.test(trimmed)) return true;
  // Bare filename with no extension but underscore/number filename shape
  // e.g. "chapter_01_final" — still reject in favor of a generated label.
  if (/^[a-z0-9_\-]+$/i.test(trimmed) && /\d/.test(trimmed) && trimmed.includes('_')) {
    return true;
  }
  return false;
}

/**
 * Returns a safe, human-readable chapter label for a track.
 * Never returns a filename. Falls back to "Chapter N" using
 * track_number (preferred) or the array index (fallback).
 */
export function getChapterLabel(track, index = 0) {
  if (!track) return `Chapter ${index + 1}`;

  const candidates = [track.title, track.chapter_title, track.chapterTitle];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim() && !looksLikeFilename(candidate)) {
      return candidate.trim();
    }
  }

  const number =
    typeof track.track_number === 'number' && Number.isFinite(track.track_number)
      ? track.track_number
      : index + 1;

  return `Chapter ${number}`;
}

/** Resolves the internal (never-rendered) audio URL for a track. */
export function getAudioUrl(track) {
  if (!track) return '';
  return track.audio_url || track.file_url || track.url || '';
}
