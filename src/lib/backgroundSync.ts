/**
 * Background file sync — downloads all files to Cache API silently.
 * Background data sync — writes all Supabase data to IndexedDB.
 * Both run on app open and when the tab regains focus.
 * Never blocks the UI; shows a small indicator via listeners.
 */
import { supabase } from './supabase';
import { isFileCached, cacheFile } from './fileCache';
import {
  cacheTrips,
  cacheFlights,
  cacheHotels,
  cacheTripDocuments,
  cacheMemberDocuments,
} from './db';

// ── Sync status observable ─────────────────────────────────────────────────────

type SyncStatus = 'idle' | 'syncing';

let _status: SyncStatus = 'idle';
const _listeners = new Set<(s: SyncStatus) => void>();
let _running = false;

export function getSyncStatus(): SyncStatus { return _status; }

export function onSyncStatusChange(fn: (s: SyncStatus) => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function setStatus(s: SyncStatus) {
  _status = s;
  _listeners.forEach(fn => fn(s));
}

// ── Data sync (IndexedDB) ──────────────────────────────────────────────────────

/**
 * Fetches all data from Supabase and writes it to IndexedDB for offline access.
 * Called on every app unlock and tab focus. Silent on failure.
 */
export async function syncAllData(): Promise<void> {
  try {
    const [tripsRes, flightsRes, hotelsRes, tripDocsRes, memberDocsRes] = await Promise.all([
      supabase.from('trips').select('*'),
      supabase.from('flights').select('*'),
      supabase.from('hotels').select('*'),
      supabase.from('trip_documents').select('*'),
      supabase.from('member_documents').select('*'),
    ]);
    await Promise.all([
      cacheTrips(tripsRes.data ?? []),
      cacheFlights(flightsRes.data ?? []),
      cacheHotels(hotelsRes.data ?? []),
      cacheTripDocuments(tripDocsRes.data ?? []),
      cacheMemberDocuments(memberDocsRes.data ?? []),
    ]);
  } catch {
    // Silent failure — offline or Supabase unavailable
  }
}

// ── File sync (Cache API) ──────────────────────────────────────────────────────

export async function syncAllFiles(): Promise<void> {
  if (_running) return; // prevent concurrent runs
  _running = true;
  setStatus('syncing');

  try {
    const filesToSync: Array<{ bucket: string; path: string }> = [];
    const now = new Date().toISOString();

    // 1. Upcoming flight ticket files
    const { data: flights } = await supabase
      .from('flights')
      .select('ticket_pdf_url')
      .gte('departure_datetime_utc', now)
      .not('ticket_pdf_url', 'is', null);
    for (const f of flights ?? []) {
      if (f.ticket_pdf_url) filesToSync.push({ bucket: 'tickets', path: f.ticket_pdf_url });
    }

    // 2. Hotel vouchers
    const { data: hotels } = await supabase
      .from('hotels')
      .select('voucher_url')
      .not('voucher_url', 'is', null);
    for (const h of hotels ?? []) {
      if (h.voucher_url) filesToSync.push({ bucket: 'vouchers', path: h.voucher_url });
    }

    // 3. Trip documents
    const { data: tripDocs } = await supabase
      .from('trip_documents')
      .select('file_url')
      .not('file_url', 'is', null);
    for (const d of tripDocs ?? []) {
      if (d.file_url) filesToSync.push({ bucket: 'documents', path: d.file_url });
    }

    // 4. Member documents (passports, visas, insurance)
    const { data: memberDocs } = await supabase
      .from('member_documents')
      .select('file_url')
      .not('file_url', 'is', null);
    for (const d of memberDocs ?? []) {
      if (d.file_url) filesToSync.push({ bucket: 'member-documents', path: d.file_url });
    }

    // Download anything not already cached
    for (const { bucket, path } of filesToSync) {
      try {
        if (!(await isFileCached(bucket, path))) {
          await cacheFile(bucket, path);
        }
      } catch (err) {
        console.warn('[FileSync] Failed to cache file:', bucket, path, err);
      }
    }
  } catch {
    // Silent failure — offline or Supabase unavailable
  } finally {
    _running = false;
    setStatus('idle');
  }
}

/** Register visibilitychange handler to re-sync when tab regains focus. */
export function registerVisibilitySync(): () => void {
  const handler = () => {
    if (document.visibilityState === 'visible') {
      syncAllData();
      syncAllFiles();
    }
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
