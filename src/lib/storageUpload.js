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

/** Guesses an ebook_files.file_type from an uploaded file's name/type. */
export function guessEbookFileType(file) {
  const name = (file?.name || '').toLowerCase();
  if (name.endsWith('.pdf') || file?.type === 'application/pdf') return 'pdf';
  if (name.endsWith('.epub')) return 'epub';
  return 'txt';
}
