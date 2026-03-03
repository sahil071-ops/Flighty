const PDF_CACHE_NAME = 'ticket-pdfs-v1';

export async function cachePDF(url: string): Promise<void> {
  const cache = await caches.open(PDF_CACHE_NAME);
  // Fetch with no-cors if needed; but since we use signed Supabase URLs this should work
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
  await cache.put(url, response);
}

export async function getCachedPDF(url: string): Promise<Response | undefined> {
  const cache = await caches.open(PDF_CACHE_NAME);
  const cached = await cache.match(url);
  return cached ?? undefined;
}

export async function isPDFCached(url: string): Promise<boolean> {
  const cache = await caches.open(PDF_CACHE_NAME);
  const match = await cache.match(url);
  return match !== undefined;
}

export async function removeCachedPDF(url: string): Promise<void> {
  const cache = await caches.open(PDF_CACHE_NAME);
  await cache.delete(url);
}

export async function openPDFBlob(url: string): Promise<void> {
  let response = await getCachedPDF(url);
  if (!response) {
    // Not cached — fetch and cache
    await cachePDF(url);
    response = await getCachedPDF(url);
  }
  if (!response) throw new Error('PDF not available');
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}

export async function downloadPDF(url: string, filename: string): Promise<void> {
  let response = await getCachedPDF(url);
  if (!response) {
    await cachePDF(url);
    response = await getCachedPDF(url);
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
