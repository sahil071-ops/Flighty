/**
 * Rate-limited AviationStack flight status fetcher.
 * Rules:
 * - Never auto-fetch on page load
 * - Never auto-poll
 * - Only fetch on explicit user action
 * - Cache responses in IndexedDB for 15 minutes
 * - Show "Last checked X mins ago" for cached results
 */

import type { FlightStatus, FlightStatusCode } from '@/types';
import { cacheFlightStatus, getCachedFlightStatus } from './db';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface FlightStatusResult {
  status: FlightStatus | null;
  cached: boolean;
  cacheAgeMinutes: number | null;
  error: string | null;
}

export function isCacheStale(status: FlightStatus): boolean {
  const age = Date.now() - new Date(status.last_fetched).getTime();
  return age > CACHE_TTL_MS;
}

export function cacheAgeMinutes(status: FlightStatus): number {
  return Math.round((Date.now() - new Date(status.last_fetched).getTime()) / 60000);
}

function mapStatusCode(raw: string): FlightStatusCode {
  const s = raw.toLowerCase();
  if (s === 'active' || s === 'en-route') return 'active';
  if (s === 'landed') return 'landed';
  if (s === 'cancelled') return 'cancelled';
  if (s === 'incident') return 'incident';
  if (s === 'diverted') return 'diverted';
  return 'scheduled';
}

/** Returns the cached status if fresh, otherwise null */
export async function getCachedStatus(flightNumber: string, date: string): Promise<FlightStatus | null> {
  const cached = await getCachedFlightStatus(flightNumber, date);
  if (!cached) return null;
  return cached;
}

/** Fetch live status from AviationStack (call only on user action) */
export async function fetchFlightStatus(
  flightNumber: string,
  date: string, // YYYY-MM-DD
): Promise<FlightStatusResult> {
  // Check cache first
  const cached = await getCachedFlightStatus(flightNumber, date);
  if (cached && !isCacheStale(cached)) {
    return { status: cached, cached: true, cacheAgeMinutes: cacheAgeMinutes(cached), error: null };
  }

  try {
    // Normalise flight number: AviationStack expects no dash/space (e.g. "W46003" not "W4-6003")
    const iataCode = flightNumber.replace(/[\s-]/g, '');
    const params = new URLSearchParams({ flight_iata: iataCode, flight_date: date });
    const response = await fetch(`/api/aviationstack?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const err = await response.text();
      // Return cached if available, even if stale
      if (cached) return { status: cached, cached: true, cacheAgeMinutes: cacheAgeMinutes(cached), error: null };
      return { status: null, cached: false, cacheAgeMinutes: null, error: `API error: ${err}` };
    }

    const data = await response.json();
    const flight = data?.data?.[0];

    if (!flight) {
      if (cached) return { status: cached, cached: true, cacheAgeMinutes: cacheAgeMinutes(cached), error: null };
      return { status: null, cached: false, cacheAgeMinutes: null, error: 'Flight not found in AviationStack' };
    }

    const depDelay = flight.departure?.delay ?? null;
    const arrDelay = flight.arrival?.delay ?? null;

    const status: FlightStatus = {
      flight_number: flightNumber,
      date,
      status: mapStatusCode(flight.flight_status ?? 'scheduled'),
      departure_scheduled: flight.departure?.scheduled ?? null,
      departure_actual: flight.departure?.actual ?? null,
      arrival_scheduled: flight.arrival?.scheduled ?? null,
      arrival_actual: flight.arrival?.actual ?? null,
      departure_gate: flight.departure?.gate ?? null,
      arrival_gate: flight.arrival?.gate ?? null,
      departure_delay: depDelay ? Number(depDelay) : null,
      arrival_delay: arrDelay ? Number(arrDelay) : null,
      last_fetched: new Date().toISOString(),
    };

    await cacheFlightStatus(status);
    return { status, cached: false, cacheAgeMinutes: 0, error: null };
  } catch (err) {
    if (cached) return { status: cached, cached: true, cacheAgeMinutes: cacheAgeMinutes(cached), error: null };
    return { status: null, cached: false, cacheAgeMinutes: null, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export function statusLabel(code: FlightStatusCode): string {
  switch (code) {
    case 'scheduled': return 'Scheduled';
    case 'active': return 'En Route';
    case 'landed': return 'Landed';
    case 'cancelled': return 'Cancelled';
    case 'incident': return 'Incident';
    case 'diverted': return 'Diverted';
  }
}

export function statusColor(code: FlightStatusCode): string {
  switch (code) {
    case 'scheduled': return 'text-slate-300 bg-slate-700';
    case 'active': return 'text-blue-300 bg-blue-900/60';
    case 'landed': return 'text-emerald-300 bg-emerald-900/60';
    case 'cancelled': return 'text-red-300 bg-red-900/60';
    case 'incident': return 'text-orange-300 bg-orange-900/60';
    case 'diverted': return 'text-amber-300 bg-amber-900/60';
  }
}

export function formatDelay(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `+${m}m`;
  return `+${h}h ${m}m`;
}
