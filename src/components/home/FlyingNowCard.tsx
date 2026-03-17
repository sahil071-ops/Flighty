/**
 * Flying Now card — shown on Home screen when any family flight
 * departs within the next 3 hours (and hasn't departed more than 30 min ago).
 * Deduplicates: one card per flight number + date, shows all member dots.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getCachedFlights } from '@/lib/db';
import { useOffline } from '@/context/OfflineContext';
import { getMember } from '@/data/members';
import { fetchFlightStatus, statusLabel, statusColor, cacheAgeMinutes as calcAge } from '@/lib/flightStatus';
import { getCachedFlightStatus } from '@/lib/db';
import { formatLocalTime, getTimezoneAbbr } from '@/lib/timezone';
import { Avatar } from '@/components/ui/Avatar';
import type { Flight, FlightStatus } from '@/types';

interface FlightGroup {
  key: string;
  flightNumber: string;
  airline: string | null;
  departureCode: string;
  arrivalCode: string;
  departureDatetimeUtc: string;
  departureTimezone: string;
  memberIds: string[];
  flightIds: string[];
  tripId: string;
  representativeFlightId: string;
}

function minutesUntilDeparture(utcIso: string): number {
  return Math.round((new Date(utcIso).getTime() - Date.now()) / 60000);
}

function formatCountdown(minutes: number): string {
  if (minutes <= 0) return 'Departed';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function groupFlights(flights: Flight[]): FlightGroup[] {
  const map = new Map<string, FlightGroup>();
  for (const f of flights) {
    const date = f.departure_datetime_utc.slice(0, 10);
    const key = `${f.flight_number}_${date}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        flightNumber: f.flight_number,
        airline: f.airline,
        departureCode: f.departure_airport_code,
        arrivalCode: f.arrival_airport_code,
        departureDatetimeUtc: f.departure_datetime_utc,
        departureTimezone: f.departure_timezone,
        memberIds: [],
        flightIds: [],
        tripId: f.trip_id,
        representativeFlightId: f.id,
      });
    }
    const group = map.get(key)!;
    if (!group.memberIds.includes(f.family_member_id)) {
      group.memberIds.push(f.family_member_id);
    }
    group.flightIds.push(f.id);
  }
  return Array.from(map.values());
}

export function FlyingNowCard() {
  const navigate = useNavigate();
  const { isOnline } = useOffline();
  const [groups, setGroups] = useState<FlightGroup[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, FlightStatus>>({});
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    loadFlights();
    const interval = setInterval(loadFlights, 60000);
    return () => clearInterval(interval);
  }, [isOnline]);

  async function loadFlights() {
    try {
      let flights: Flight[];
      if (isOnline) {
        const { data } = await supabase.from('flights').select('*');
        flights = (data ?? []) as Flight[];
      } else {
        flights = await getCachedFlights();
      }

      const now = Date.now();
      const relevant = flights.filter(f => {
        const depMs = new Date(f.departure_datetime_utc).getTime();
        const diffMin = (depMs - now) / 60000;
        return diffMin >= -30 && diffMin <= 180;
      });

      const grouped = groupFlights(relevant);
      setGroups(grouped);

      const statuses: Record<string, FlightStatus> = {};
      for (const g of grouped) {
        const date = g.departureDatetimeUtc.slice(0, 10);
        const cached = await getCachedFlightStatus(g.flightNumber, date);
        if (cached) statuses[g.key] = cached;
      }
      setStatusMap(statuses);
    } catch {
      // Non-critical
    }
  }

  async function handleRefreshStatus(group: FlightGroup) {
    if (!isOnline) return;
    setRefreshing(group.key);
    const date = group.departureDatetimeUtc.slice(0, 10);
    const result = await fetchFlightStatus(group.flightNumber, date);
    if (result.status) {
      setStatusMap(prev => ({ ...prev, [group.key]: result.status! }));
    }
    setRefreshing(null);
  }

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {groups.map(group => {
        const minsUntil = minutesUntilDeparture(group.departureDatetimeUtc);
        const depTime = formatLocalTime(group.departureDatetimeUtc, group.departureTimezone);
        const depAbbr = getTimezoneAbbr(group.departureDatetimeUtc, group.departureTimezone);
        const flightStatus = statusMap[group.key];
        const gateFromStatus = flightStatus?.departure_gate;
        const isRefreshing = refreshing === group.key;
        const isDeparted = minsUntil <= 0;

        return (
          <div
            key={group.key}
            className="rounded-2xl overflow-hidden border dark:border-cyan-400/20 border-cyan-600/20 bg-slate-800"
          >
            {/* Top accent line */}
            <div className="h-px bg-gradient-to-r from-cyan-400/60 via-cyan-400/30 to-transparent" />

            <div className="p-4">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  </svg>
                  <span className="text-[10px] font-bold text-cyan-400 tracking-[0.1em] uppercase">
                    Flying Now
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[13px] font-bold tabular-nums ${isDeparted ? 'text-slate-500' : 'text-white'}`}>
                    {formatCountdown(minsUntil)}
                  </span>
                  {isOnline && (
                    <button
                      onClick={e => { e.stopPropagation(); handleRefreshStatus(group); }}
                      disabled={isRefreshing}
                      className="text-slate-600 hover:text-cyan-400 transition-colors disabled:opacity-40"
                    >
                      <svg
                        className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Clickable flight body */}
              <button
                className="w-full text-left"
                onClick={() => navigate(`/flights/${group.representativeFlightId}`)}
              >
                {/* Route + time */}
                <div className="flex items-end justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[32px] font-bold tracking-tight text-white leading-none">
                      {group.departureCode}
                    </span>
                    <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                    </svg>
                    <span className="font-mono text-[32px] font-bold tracking-tight text-white leading-none">
                      {group.arrivalCode}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[18px] font-bold text-white tabular-nums leading-none">
                      {depTime}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{depAbbr} · {group.flightNumber}</div>
                  </div>
                </div>

                {/* Gate + status */}
                {(gateFromStatus || flightStatus) && (
                  <div className="flex items-center gap-2 mb-3">
                    {gateFromStatus && (
                      <span className="text-[12px] font-bold text-white bg-slate-800 border border-white/[.08] px-2.5 py-1 rounded-lg">
                        Gate {gateFromStatus}
                      </span>
                    )}
                    {flightStatus && (
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${statusColor(flightStatus.status)}`}>
                        {statusLabel(flightStatus.status)}
                      </span>
                    )}
                    {flightStatus && (
                      <span className="text-[10px] text-slate-700 ml-auto">
                        {calcAge(flightStatus)}m ago
                      </span>
                    )}
                  </div>
                )}

                {/* Member avatars */}
                <div className="flex items-center gap-1.5">
                  {group.memberIds.map(id => {
                    const m = getMember(id);
                    if (!m) return null;
                    return <Avatar key={id} name={m.name} colour={m.colour} size="sm" />;
                  })}
                </div>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
