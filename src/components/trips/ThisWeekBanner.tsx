import { useState, useEffect } from 'react';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { getCachedFlights } from '@/lib/db';
import { getMember } from '@/data/members';
import type { Flight } from '@/types';

function relativeDayLabel(istDateStr: string): string {
  const today = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(today);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [fy, fm, fd] = istDateStr.split('-').map(Number);
  const diffDays = Math.round(
    (Date.UTC(fy, fm - 1, fd) - Date.UTC(ty, tm - 1, td)) / 86400000
  );
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays > 1) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
}

function getISTDate(utcStr: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(utcStr));
}

export function ThisWeekBanner() {
  const { isOnline } = useOffline();
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => { load(); }, [isOnline]);

  async function load() {
    const now = new Date().toISOString();
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    try {
      let result: Flight[];
      if (isOnline) {
        const { data } = await supabase
          .from('flights')
          .select('*')
          .gte('departure_datetime_utc', now)
          .lte('departure_datetime_utc', weekLater)
          .order('departure_datetime_utc');
        result = data ?? [];
      } else {
        const cached = await getCachedFlights();
        result = cached.filter(f => f.departure_datetime_utc >= now && f.departure_datetime_utc <= weekLater);
      }
      setFlights(result);
    } catch {
      // silent — banner is optional
    }
  }

  if (flights.length === 0) return null;

  const byMember = new Map<string, Flight>();
  for (const f of flights) {
    if (!byMember.has(f.family_member_id)) byMember.set(f.family_member_id, f);
  }

  const entries = [...byMember.entries()];
  let text = '';

  if (entries.length === 1) {
    const [memberId, f] = entries[0];
    const name = getMember(memberId)?.name ?? memberId;
    const dest = f.arrival_city ?? f.arrival_airport_code;
    const day = relativeDayLabel(getISTDate(f.departure_datetime_utc));
    text = `${name} flies to ${dest} ${day}`;
  } else if (entries.length === 2) {
    const names = entries.map(([id]) => getMember(id)?.name ?? id);
    const day = relativeDayLabel(getISTDate(entries[0][1].departure_datetime_utc));
    text = `${names[0]} & ${names[1]} are travelling ${day}`;
  } else {
    text = `${entries.length} family members travelling this week`;
  }

  return (
    <div className="dark:bg-sky-900/40 bg-sky-50 dark:border-sky-700/50 border-sky-300 border rounded-xl px-4 py-3 flex items-center gap-3">
      <svg className="w-4 h-4 dark:text-sky-400 text-sky-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
      </svg>
      <p className="text-sm dark:text-sky-300 text-sky-800">{text}</p>
    </div>
  );
}
