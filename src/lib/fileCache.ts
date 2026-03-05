/**
 * Unified file cache for all Supabase storage buckets.
 * Cache key format: familyflights-files/{bucket}/{path}
 * Files are fetched fresh each time they're not in cache.
 * The signed URL (if any) is never stored — only the file content.
 */
import { supabase } from './supabase';

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
    throw new Error(`Failed to fetch ${bucket}/${path}: ${error?.message ?? 'unknown'}`);
  }
  return data;
}

export async function cacheFile(bucket: string, path: string): Promise<void> {
  const blob = await fetchFromStorage(bucket, path);
  const cache = await caches.open(CACHE_NAME);
  await cache.put(
    cacheKey(bucket, path),
    new Response(blob, { headers: { 'Content-Type': blob.type || 'application/octet-stream' } }),
  );
}

export async function isFileCached(bucket: string, path: string): Promise<boolean> {
  const cache = await caches.open(CACHE_NAME);
  return !!(await cache.match(cacheKey(bucket, path)));
}

export async function getOrFetchBlob(bucket: string, path: string): Promise<Blob> {
  const cache = await caches.open(CACHE_NAME);
  let response = await cache.match(cacheKey(bucket, path));
  if (!response) {
    await cacheFile(bucket, path);
    response = await cache.match(cacheKey(bucket, path));
  }
  if (!response) throw new Error('File not available');
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
