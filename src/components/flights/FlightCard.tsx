import { Link } from 'react-router-dom';
import type { Flight } from '@/types';
import type { Member } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';
import {
  formatLocalTime,
  formatLocalDateCard,
  getTimezoneAbbr,
  getDurationString,
} from '@/lib/timezone';

interface FlightCardProps {
  flight: Flight;
  member?: Member;
  showMember?: boolean;
  grouped?: boolean; // true when rendered inside a TripGroup (removes outer rounding)
}

export function FlightCard({ flight, member, showMember = true, grouped = false }: FlightCardProps) {
  const isPast = flight.arrival_datetime_utc < new Date().toISOString();
  const depTime = formatLocalTime(flight.departure_datetime_utc, flight.departure_timezone);
  const arrTime = formatLocalTime(flight.arrival_datetime_utc, flight.arrival_timezone);
  const depDate = formatLocalDateCard(flight.departure_datetime_utc, flight.departure_timezone);
  const depAbbr = getTimezoneAbbr(flight.departure_datetime_utc, flight.departure_timezone);
  const arrAbbr = getTimezoneAbbr(flight.arrival_datetime_utc, flight.arrival_timezone);
  const duration = getDurationString(flight.departure_datetime_utc, flight.arrival_datetime_utc);

  const colour = member?.colour ?? '#64748b';

  return (
    <Link
      to={`/flights/${flight.id}`}
      className={`block overflow-hidden active:scale-[0.99] transition-all ${grouped ? '' : 'rounded-xl'} ${isPast ? 'opacity-50' : 'bg-slate-800 hover:bg-slate-750'}`}
      style={isPast ? { backgroundColor: '#1a2030' } : undefined}
    >
      {/* Colour accent bar */}
      {!grouped && <div className="h-0.5" style={{ backgroundColor: isPast ? '#334155' : colour }} />}

      <div className="p-4">
        {/* Top row: member + date */}
        {showMember && member ? (
          <div className="flex items-center gap-2 mb-3">
            <Avatar name={member.name} colour={isPast ? '#64748b' : colour} size="sm" />
            <span className="text-xs text-slate-400 font-medium">{member.name}</span>
            <span className="text-sm font-medium text-slate-300 ml-auto">{depDate}</span>
            {isPast && <span className="text-[10px] bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded ml-1">Completed</span>}
          </div>
        ) : (
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-300">{depDate}</div>
            {isPast && <span className="text-[10px] bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">Completed</span>}
          </div>
        )}

        {/* Route row */}
        <div className="flex items-center gap-3">
          {/* Departure */}
          <div className="text-center min-w-0">
            <div className="text-2xl font-bold text-white tabular-nums">{depTime}</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">{flight.departure_airport_code}</div>
            <div className="text-[10px] text-slate-500">{depAbbr}</div>
          </div>

          {/* Flight path */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="text-[10px] text-slate-500 truncate max-w-full text-center">
              {flight.flight_number}
            </div>
            <div className="w-full flex items-center gap-1">
              <div className="h-px flex-1 bg-slate-600" />
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
              <div className="h-px flex-1 bg-slate-600" />
            </div>
            {duration && (
              <div className="text-[10px] text-slate-500">{duration}</div>
            )}
          </div>

          {/* Arrival */}
          <div className="text-center min-w-0">
            <div className="text-2xl font-bold text-white tabular-nums">{arrTime}</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">{flight.arrival_airport_code}</div>
            <div className="text-[10px] text-slate-500">{arrAbbr}</div>
          </div>
        </div>

        {/* Bottom row: airline + booking ref */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-400 truncate">
            {flight.airline ?? flight.flight_number}
          </span>
          <div className="flex items-center gap-2">
            {flight.booking_reference && (
              <span className="text-xs text-slate-500 font-mono">{flight.booking_reference}</span>
            )}
            {flight.ticket_pdf_url && (
              <span className="text-[10px] bg-sky-900/60 text-sky-400 px-1.5 py-0.5 rounded">PDF</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
