import { supabase } from './supabase';

const PDF_CACHE_NAME = 'ticket-pdfs-v1';
const BUCKET = 'tickets';

// Cache key is based on the storage path, not the URL, so it never expires.
function cacheKey(storagePath: string): string {
  return `storage://${BUCKET}/${storagePath}`;
}

async function fetchBlobFromStorage(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) throw new Error(`Failed to fetch PDF: ${error?.message ?? 'unknown error'}`);
  return data;
}

export async function cachePDF(storagePath: string): Promise<void> {
  const blob = await fetchBlobFromStorage(storagePath);
  const cache = await caches.open(PDF_CACHE_NAME);
  const response = new Response(blob, { headers: { 'Content-Type': 'application/pdf' } });
  await cache.put(cacheKey(storagePath), response);
}

export async function getCachedPDF(storagePath: string): Promise<Response | undefined> {
  const cache = await caches.open(PDF_CACHE_NAME);
  const cached = await cache.match(cacheKey(storagePath));
  return cached ?? undefined;
}

export async function isPDFCached(storagePath: string): Promise<boolean> {
  const cache = await caches.open(PDF_CACHE_NAME);
  const match = await cache.match(cacheKey(storagePath));
  return match !== undefined;
}

export async function removeCachedPDF(storagePath: string): Promise<void> {
  const cache = await caches.open(PDF_CACHE_NAME);
  await cache.delete(cacheKey(storagePath));
}

export async function openPDFBlob(storagePath: string): Promise<void> {
  let response = await getCachedPDF(storagePath);
  if (!response) {
    await cachePDF(storagePath);
    response = await getCachedPDF(storagePath);
  }
  if (!response) throw new Error('PDF not available');
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}

export async function downloadPDF(storagePath: string, filename: string): Promise<void> {
  let response = await getCachedPDF(storagePath);
  if (!response) {
    await cachePDF(storagePath);
    response = await getCachedPDF(storagePath);
  }
  if (!response) throw new Error('PDF not available');
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}
