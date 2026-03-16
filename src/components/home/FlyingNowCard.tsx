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
import { getMember, FAMILY_MEMBERS } from '@/data/members';
import { fetchFlightStatus, statusLabel, statusColor, cacheAgeMinutes as calcAge } from '@/lib/flightStatus';
import { getCachedFlightStatus } from '@/lib/db';
import { formatLocalTime, getTimezoneAbbr } from '@/lib/timezone';
import { Avatar } from '@/components/ui/Avatar';
import type { Flight, FlightStatus } from '@/types';

interface FlightGroup {
  key: string; // flightNumber_date
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
    const interval = setInterval(loadFlights, 60000); // Re-check every minute
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
      // Filter: departing within -30min to +3hr window
      const relevant = flights.filter(f => {
        const depMs = new Date(f.departure_datetime_utc).getTime();
        const diffMin = (depMs - now) / 60000;
        return diffMin >= -30 && diffMin <= 180;
      });

      const grouped = groupFlights(relevant);
      setGroups(grouped);

      // Load cached statuses
      const statuses: Record<string, FlightStatus> = {};
      for (const g of grouped) {
        const date = g.departureDatetimeUtc.slice(0, 10);
        const cached = await getCachedFlightStatus(g.flightNumber, date);
        if (cached) statuses[g.key] = cached;
      }
      setStatusMap(statuses);
    } catch {
      // Non-critical — card just won't show
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
    <div className="flex flex-col gap-3 mb-2">
      {groups.map(group => {
        const minsUntil = minutesUntilDeparture(group.departureDatetimeUtc);
        const depTime = formatLocalTime(group.departureDatetimeUtc, group.departureTimezone);
        const depAbbr = getTimezoneAbbr(group.departureDatetimeUtc, group.departureTimezone);
        const flightStatus = statusMap[group.key];
        const gateFromStatus = flightStatus?.departure_gate;
        const isRefreshing = refreshing === group.key;

        return (
          <div
            key={group.key}
            className="bg-gradient-to-r from-sky-900/80 to-slate-800 border border-sky-700/60 rounded-2xl overflow-hidden"
          >
            <div className="h-0.5 bg-gradient-to-r from-sky-400 to-sky-600" />
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  </svg>
                  <span className="text-xs font-semibold text-sky-400 uppercase tracking-wide">Flying Now</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-300">
                    {formatCountdown(minsUntil)}
                  </span>
                  {isOnline && (
                    <button
                      onClick={e => { e.stopPropagation(); handleRefreshStatus(group); }}
                      disabled={isRefreshing}
                      className="text-slate-500 hover:text-sky-400 transition-colors"
                    >
                      <svg
                        className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Clickable flight info */}
              <button
                className="w-full text-left"
                onClick={() => navigate(`/flights/${group.representativeFlightId}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-2xl font-bold text-white">{group.departureCode}</span>
                    <span className="text-slate-400 mx-3">→</span>
                    <span className="text-2xl font-bold text-white">{group.arrivalCode}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-white">{depTime} <span className="text-xs text-slate-400">{depAbbr}</span></div>
                    <div className="text-xs text-slate-400">{group.flightNumber}</div>
                  </div>
                </div>

                {/* Gate + status */}
                <div className="flex items-center gap-3 mb-3">
                  {gateFromStatus && (
                    <span className="text-sm font-bold text-white bg-slate-700 px-2 py-0.5 rounded">
                      Gate {gateFromStatus}
                    </span>
                  )}
                  {flightStatus && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(flightStatus.status)}`}>
                      {statusLabel(flightStatus.status)}
                    </span>
                  )}
                  {flightStatus && (
                    <span className="text-[10px] text-slate-600 ml-auto">
                      {calcAge(flightStatus)}m ago
                    </span>
                  )}
                </div>

                {/* Member dots */}
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
