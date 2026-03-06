/**
 * Unified file cache for all Supabase storage buckets.
 *
 * Cache key format (Cache API): familyflights-files/{bucket}/{path}
 * Manifest key format (IndexedDB): {bucket}:{path}
 *
 * On every successful download the file is stored in the Cache API AND
 * the path is recorded in the IndexedDB `cached_files` manifest.
 * `isFileCached` reads from the manifest first (fast), falling back to
 * a Cache API lookup so existing cached files still register.
 */
import { supabase } from './supabase';
import { markFileCached, isFileManifested } from './db';

const CACHE_NAME = 'familyflights-files-v1';

function cacheKey(bucket: string, path: string): string {
  return `familyflights-files/${bucket}/${encodeURIComponent(path)}`;
}

async function ensureSession(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    await supabase.auth.signInAnonymously();
  }
}

async function fetchFromStorage(bucket: string, path: string): Promise<Blob> {
  await ensureSession();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Storage download failed for ${bucket}/${path}: ${error?.message ?? 'no data'}`);
  }
  return data;
}

/**
 * Download a file from Supabase storage, store in Cache API, and record
 * in the IndexedDB manifest so `isFileCached` returns true immediately.
 */
export async function cacheFile(bucket: string, path: string): Promise<void> {
  const blob = await fetchFromStorage(bucket, path);
  const cache = await caches.open(CACHE_NAME);
  await cache.put(
    cacheKey(bucket, path),
    new Response(blob, { headers: { 'Content-Type': blob.type || 'application/octet-stream' } }),
  );
  // Record in IndexedDB manifest so the "offline ✓" indicator turns green
  await markFileCached(bucket, path);
}

/**
 * Check whether a file is available offline.
 * Reads from the IndexedDB manifest first (fast path).
 * Falls back to a Cache API lookup for files cached before the manifest existed.
 */
export async function isFileCached(bucket: string, path: string): Promise<boolean> {
  // Fast path: IndexedDB manifest
  if (await isFileManifested(bucket, path)) return true;
  // Slow path: Cache API lookup (back-fills manifest on hit)
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = !!(await cache.match(cacheKey(bucket, path)));
    if (hit) await markFileCached(bucket, path); // back-fill manifest
    return hit;
  } catch {
    return false;
  }
}

export async function getOrFetchBlob(bucket: string, path: string): Promise<Blob> {
  // Try Cache API first
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(cacheKey(bucket, path));
    if (response) return response.blob();
  } catch {
    // Fall through to network fetch
  }
  // Not cached — download, cache, and return
  await cacheFile(bucket, path);
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(cacheKey(bucket, path));
  if (!response) throw new Error('File not available after caching');
  return response.blob();
}

export async function openFile(bucket: string, path: string): Promise<void> {
  const blob = await getOrFetchBlob(bucket, path);
  window.open(URL.createObjectURL(blob), '_blank');
}

export async function downloadFile(bucket: string, path: string, filename: string): Promise<void> {
  const blob = await getOrFetchBlob(bucket, path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
