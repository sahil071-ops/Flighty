import { supabase } from './supabase';

const DOC_CACHE_NAME = 'member-docs-v1';
const DOC_BUCKET = 'member-documents';

function cacheKey(storagePath: string): string {
  return `storage://${DOC_BUCKET}/${storagePath}`;
}

async function fetchBlob(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(DOC_BUCKET).download(storagePath);
  if (error || !data) throw new Error(`Failed to fetch document: ${error?.message ?? 'unknown'}`);
  return data;
}

export async function cacheDocFile(storagePath: string): Promise<void> {
  const blob = await fetchBlob(storagePath);
  const cache = await caches.open(DOC_CACHE_NAME);
  const contentType = blob.type || 'application/octet-stream';
  await cache.put(cacheKey(storagePath), new Response(blob, { headers: { 'Content-Type': contentType } }));
}

export async function isDocFileCached(storagePath: string): Promise<boolean> {
  const cache = await caches.open(DOC_CACHE_NAME);
  return (await cache.match(cacheKey(storagePath))) !== undefined;
}

export async function openDocFileBlob(storagePath: string): Promise<void> {
  const cache = await caches.open(DOC_CACHE_NAME);
  let response = await cache.match(cacheKey(storagePath));
  if (!response) {
    await cacheDocFile(storagePath);
    response = await cache.match(cacheKey(storagePath));
  }
  if (!response) throw new Error('Document not available');
  const blob = await response.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

export async function downloadDocFile(storagePath: string, filename: string): Promise<void> {
  const cache = await caches.open(DOC_CACHE_NAME);
  let response = await cache.match(cacheKey(storagePath));
  if (!response) {
    await cacheDocFile(storagePath);
    response = await cache.match(cacheKey(storagePath));
  }
  if (!response) throw new Error('Document not available');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
