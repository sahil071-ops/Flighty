/**
 * Backward-compatible wrappers around the unified fileCache.
 * All ticket/PDF operations now go through fileCache.ts which
 * always fetches with a fresh auth session.
 */
import { isFileCached, openFile, downloadFile, cacheFile } from './fileCache';

const BUCKET = 'tickets';

export async function isPDFCached(storagePath: string): Promise<boolean> {
  return isFileCached(BUCKET, storagePath);
}

export async function cachePDF(storagePath: string): Promise<void> {
  return cacheFile(BUCKET, storagePath);
}

export async function openPDFBlob(storagePath: string): Promise<void> {
  return openFile(BUCKET, storagePath);
}

export async function downloadPDF(storagePath: string, filename: string): Promise<void> {
  return downloadFile(BUCKET, storagePath, filename);
}
