import { supabase } from './supabaseClient';

/**
 * Uploads a File object to a Supabase Storage bucket and returns its public
 * URL. Path convention is "{libraryId}/{bookId}/{filename}" — the storage
 * RLS policies check the first path segment against library_admins, so
 * callers MUST pass a real libraryId/bookId, not arbitrary strings.
 *
 * @param {'covers'|'audio'|'ebooks'} bucket
 * @param {string} libraryId
 * @param {string} bookId
 * @param {File} file
 * @returns {Promise<string>} the public URL of the uploaded file
 */
export async function uploadLibraryFile(bucket, libraryId, bookId, file) {
  if (!file) throw new Error('No file selected.');
  if (!libraryId || !bookId) throw new Error('Missing library or book reference for upload.');

  // Keep the extension (players/readers may care), but never trust the
  // original filename otherwise — collisions and weird characters both
  // become non-issues this way.
  const extMatch = /\.[a-zA-Z0-9]+$/.exec(file.name || '');
  const ext = extMatch ? extMatch[0] : '';
  const safeName = `${crypto.randomUUID()}${ext}`;
  const path = `${libraryId}/${bookId}/${safeName}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Convenience wrappers for each of the three buckets. */
export const uploadCover = (libraryId, bookId, file) => uploadLibraryFile('covers', libraryId, bookId, file);
export const uploadAudioTrack = (libraryId, bookId, file) => uploadLibraryFile('audio', libraryId, bookId, file);
export const uploadEbookFile = (libraryId, bookId, file) => uploadLibraryFile('ebooks', libraryId, bookId, file);

/** Uploads a library's logo. Path: "{libraryId}/logo-{uuid}.{ext}". */
export async function uploadLibraryLogo(libraryId, file) {
  if (!file) throw new Error('No file selected.');
  if (!libraryId) throw new Error('Missing library reference for upload.');

  const extMatch = /\.[a-zA-Z0-9]+$/.exec(file.name || '');
  const ext = extMatch ? extMatch[0] : '';
  const path = `${libraryId}/logo-${crypto.randomUUID()}${ext}`;

  const { error: uploadError } = await supabase.storage.from('library-logos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('library-logos').getPublicUrl(path);
  return data.publicUrl;
}

/** ---------------- Bulk chapter-folder upload ---------------- */

const AUDIO_EXTENSION_PATTERN = /\.(mp3|m4a|m4b|wav|aac|ogg|flac|webm)$/i;

/** Filters a FileList/array down to recognized audio files. */
export function filterAudioFiles(files) {
  return Array.from(files || []).filter((f) => AUDIO_EXTENSION_PATTERN.test(f.name || ''));
}

/**
 * Sorts audio files the way a person would expect chapter order to read —
 * "Chapter 2" before "Chapter 10", not alphabetically. Uses each file's
 * full relative path (webkitRelativePath) when available, since that's
 * usually "Book Title/Chapter 03.mp3" and includes the number.
 */
export function sortAudioFilesNaturally(files) {
  return [...files].sort((a, b) => {
    const aKey = a.webkitRelativePath || a.name;
    const bKey = b.webkitRelativePath || b.name;
    return aKey.localeCompare(bKey, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Given a FileList from a folder picker, returns naturally-sorted audio
 * files ready to become chapter rows. Non-audio files (cover art, .nfo,
 * desktop.ini, etc. that sometimes live alongside audiobook files) are
 * silently dropped rather than erroring the whole import.
 */
export function prepareChapterFolder(fileList) {
  const audioFiles = filterAudioFiles(fileList);
  return sortAudioFilesNaturally(audioFiles);
}

/**
 * Reads an audio file's duration client-side (via a throwaway <audio>
 * element) before upload, so audiobook_tracks.duration_seconds can be
 * populated without needing a server-side media-processing step. Resolves
 * to null if the browser can't determine it (never blocks the upload).
 */
export function getAudioDuration(file) {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      const cleanup = () => URL.revokeObjectURL(url);
      audio.addEventListener('loadedmetadata', () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : null;
        cleanup();
        resolve(duration);
      });
      audio.addEventListener('error', () => {
        cleanup();
        resolve(null);
      });
      audio.src = url;
    } catch {
      resolve(null);
    }
  });
}

/** Guesses an ebook_files.file_type from an uploaded file's name/type. */
export function guessEbookFileType(file) {
  const name = (file?.name || '').toLowerCase();
  if (name.endsWith('.pdf') || file?.type === 'application/pdf') return 'pdf';
  if (name.endsWith('.epub')) return 'epub';
  return 'txt';
}
