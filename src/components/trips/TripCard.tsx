import { Link } from 'react-router-dom';
import type { Trip, Flight, Hotel } from '@/types';
import { getMember } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';

interface TripCardProps {
  trip: Trip;
  flights: Flight[];
  hotels: Hotel[];
}

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start + 'T12:00:00Z');
  const startFmt = s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!end) return `From ${startFmt}`;
  const e = new Date(end + 'T12:00:00Z');
  const endFmt = e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (s.getFullYear() === e.getFullYear()) {
    const startShort = s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${startShort} – ${endFmt}`;
  }
  return `${startFmt} – ${endFmt}`;
}

/** Returns the full airport chain for a sorted list of flights: ['BOM', 'LHR', 'FRA', 'LHR'] */
function buildLegChain(sortedFlights: Flight[]): string[] {
  if (sortedFlights.length === 0) return [];
  const chain: string[] = [sortedFlights[0].departure_airport_code];
  for (const f of sortedFlights) {
    chain.push(f.arrival_airport_code);
  }
  return chain;
}

export function TripCard({ trip, flights, hotels }: TripCardProps) {
  const members = trip.family_member_ids.map(id => getMember(id)).filter(Boolean);
  const primaryColour = members[0]?.colour ?? '#64748b';

  const sortedFlights = [...flights].sort((a, b) =>
    a.leg_order - b.leg_order || a.departure_datetime_utc.localeCompare(b.departure_datetime_utc)
  );

  const legChain = buildLegChain(sortedFlights);
  const isUpcoming = trip.start_date >= new Date().toISOString().slice(0, 10);

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="block bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-slate-500 active:scale-[0.99] transition-all"
    >
      <div className="h-0.5" style={{ backgroundColor: primaryColour }} />
      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{trip.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{formatDateRange(trip.start_date, trip.end_date)}</p>
          </div>
          <div className="flex -space-x-1.5 flex-shrink-0">
            {members.slice(0, 5).map(m => m && (
              <Avatar key={m.id} name={m.name} colour={m.colour} size="xs" className="ring-2 ring-slate-800" />
            ))}
          </div>
        </div>

        {/* Full leg chain: BOM → LHR → FRA → LHR */}
        {legChain.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-2.5">
            {legChain.map((code, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="font-mono text-xs font-semibold text-slate-200">{code}</span>
                {i < legChain.length - 1 && (
                  <svg className="w-3 h-3 text-slate-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  </svg>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Counts + past label */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {flights.length > 0 && (
            <span>{flights.length} flight{flights.length !== 1 ? 's' : ''}</span>
          )}
          {hotels.length > 0 && (
            <>
              <span className="text-slate-700">·</span>
              <span>{hotels.length} hotel{hotels.length !== 1 ? 's' : ''}</span>
            </>
          )}
          {flights.length === 0 && hotels.length === 0 && (
            <span>No flights added yet</span>
          )}
          {!isUpcoming && (
            <span className="ml-auto text-[10px] text-slate-600 uppercase tracking-wide">Past</span>
          )}
        </div>
      </div>
    </Link>
  );
}
