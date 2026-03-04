import { useState, useEffect, useMemo } from 'react';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { getCachedFlights } from '@/lib/db';
import { FAMILY_MEMBERS } from '@/data/members';
import type { Flight } from '@/types';

const MUMBAI_TZ = 'Asia/Kolkata';
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DISPLAY_MEMBERS = FAMILY_MEMBERS.filter(m => !m.isAdmin);

/** Returns YYYY-MM-DD in Mumbai (IST) timezone */
function getISTDate(utcStr: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MUMBAI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(utcStr));
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

/**
 * Builds a map of IST date → set of member IDs who are "away" on that day.
 * A member is away for the full span from first departure to last arrival of each trip.
 */
function computeAwayMap(flights: Flight[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  const tripFlights = new Map<string, Flight[]>();
  const singleFlights: Flight[] = [];

  for (const f of flights) {
    if (f.trip_id) {
      const arr = tripFlights.get(f.trip_id) ?? [];
      arr.push(f);
      tripFlights.set(f.trip_id, arr);
    } else {
      singleFlights.push(f);
    }
  }

  function markSpan(memberId: string, start: string, end: string) {
    let d = start;
    while (d <= end) {
      const set = map.get(d) ?? new Set<string>();
      set.add(memberId);
      map.set(d, set);
      d = addDays(d, 1);
    }
  }

  for (const [, legs] of tripFlights) {
    const memberId = legs[0].family_member_id;
    const depDates = legs.map(f => getISTDate(f.departure_datetime_utc)).sort();
    const arrDates = legs.map(f => getISTDate(f.arrival_datetime_utc)).sort();
    markSpan(memberId, depDates[0], arrDates[arrDates.length - 1]);
  }

  for (const f of singleFlights) {
    markSpan(
      f.family_member_id,
      getISTDate(f.departure_datetime_utc),
      getISTDate(f.arrival_datetime_utc),
    );
  }

  return map;
}

interface SelectedDay {
  dateStr: string;
  flights: Flight[];
}

export function CalendarView() {
  const { isOnline } = useOffline();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenMembers, setHiddenMembers] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based

  useEffect(() => {
    loadFlights();
  }, [isOnline]);

  async function loadFlights() {
    setLoading(true);
    try {
      if (isOnline) {
        const { data } = await supabase.from('flights').select('*');
        setFlights(data ?? []);
      } else {
        const cached = await getCachedFlights();
        setFlights(cached);
      }
    } finally {
      setLoading(false);
    }
  }

  const awayMap = useMemo(() => computeAwayMap(flights), [flights]);

  const visibleMemberIds = useMemo(
    () => new Set(DISPLAY_MEMBERS.filter(m => !hiddenMembers.has(m.id)).map(m => m.id)),
    [hiddenMembers],
  );

  function toggleMember(id: string) {
    setHiddenMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay(): 0=Sun, 1=Mon … we want Mon=0 so (day+6)%7
  const startDow = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function getDateStr(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const todayStr = getISTDate(new Date().toISOString());

  function handleDayClick(day: number) {
    const dateStr = getDateStr(day);
    // Show all flights spanning this date (departure ≤ date ≤ arrival), filtered by visible members
    const dayFlights = flights
      .filter(f => {
        const dep = getISTDate(f.departure_datetime_utc);
        const arr = getISTDate(f.arrival_datetime_utc);
        return dep <= dateStr && dateStr <= arr && visibleMemberIds.has(f.family_member_id);
      })
      .sort((a, b) => a.departure_datetime_utc.localeCompare(b.departure_datetime_utc));

    if (selectedDay?.dateStr === dateStr) {
      setSelectedDay(null);
    } else {
      setSelectedDay({ dateStr, flights: dayFlights });
    }
  }

  const monthLabel = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-4">
      {/* Member filter chips */}
      <div className="flex flex-wrap gap-2">
        {DISPLAY_MEMBERS.map(m => {
          const active = !hiddenMembers.has(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggleMember(m.id)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border"
              style={
                active
                  ? { backgroundColor: m.colour + '22', borderColor: m.colour, color: m.colour }
                  : { borderColor: '#475569', color: '#64748b', backgroundColor: 'transparent' }
              }
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: active ? m.colour : '#475569' }}
              />
              {m.name}
            </button>
          );
        })}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-white">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-slate-500 uppercase py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;

              const dateStr = getDateStr(day);
              const awaySet = awayMap.get(dateStr);
              const awayMembers = awaySet
                ? DISPLAY_MEMBERS.filter(m => awaySet.has(m.id) && !hiddenMembers.has(m.id))
                : [];
              const isToday = dateStr === todayStr;
              const isSelected = selectedDay?.dateStr === dateStr;

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => handleDayClick(day)}
                  className={`flex flex-col items-center py-1.5 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-slate-700'
                      : isToday
                      ? 'bg-sky-900/30'
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  <span
                    className={`text-xs font-medium leading-none mb-1.5 ${
                      isToday ? 'text-sky-400' : isSelected ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {day}
                  </span>
                  {/* Coloured dots for away members */}
                  <div className="flex flex-wrap justify-center gap-px min-h-[10px]">
                    {awayMembers.map(m => (
                      <span
                        key={m.id}
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: m.colour }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Day detail panel */}
          {selectedDay && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  {new Date(selectedDay.dateStr + 'T12:00:00Z').toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedDay.flights.length === 0 ? (
                <p className="text-xs text-slate-500">No flights for visible members on this day.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedDay.flights.map(f => {
                    const member = DISPLAY_MEMBERS.find(m => m.id === f.family_member_id);
                    const depDate = getISTDate(f.departure_datetime_utc);
                    const arrDate = getISTDate(f.arrival_datetime_utc);
                    const label =
                      depDate === selectedDay.dateStr
                        ? 'departing'
                        : arrDate === selectedDay.dateStr
                        ? 'arriving'
                        : 'in transit';

                    return (
                      <div key={f.id} className="flex items-start gap-3">
                        <div
                          className="w-1 rounded-full flex-shrink-0 mt-0.5 self-stretch"
                          style={{ backgroundColor: member?.colour ?? '#64748b', minHeight: 32 }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold" style={{ color: member?.colour ?? '#94a3b8' }}>
                              {member?.name ?? f.family_member_id}
                            </span>
                            <span className="text-[10px] text-slate-500 capitalize">{label}</span>
                          </div>
                          <div className="text-xs text-slate-300">
                            {f.departure_airport_code} → {f.arrival_airport_code}
                            {f.flight_number ? (
                              <span className="text-slate-500 ml-1">· {f.flight_number}</span>
                            ) : null}
                          </div>
                          {f.airline && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{f.airline}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
