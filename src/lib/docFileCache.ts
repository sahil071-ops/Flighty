/**
 * Backward-compatible wrappers for member-documents bucket.
 * Delegates to unified fileCache.ts.
 */
import { isFileCached, openFile, cacheFile, downloadFile } from './fileCache';

const BUCKET = 'member-documents';

export async function isDocFileCached(storagePath: string): Promise<boolean> {
  return isFileCached(BUCKET, storagePath);
}

export async function cacheDocFile(storagePath: string): Promise<void> {
  return cacheFile(BUCKET, storagePath);
}

export async function openDocFileBlob(storagePath: string): Promise<void> {
  return openFile(BUCKET, storagePath);
}

export async function downloadDocFile(storagePath: string, filename: string): Promise<void> {
  return downloadFile(BUCKET, storagePath, filename);
}
