import { Link } from 'react-router-dom';
import type { Flight, Profile } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import {
  formatLocalTime,
  formatLocalDateShort,
  getTimezoneAbbr,
  getDurationString,
} from '@/lib/timezone';

interface FlightCardProps {
  flight: Flight;
  profile?: Profile;
  showMember?: boolean;
}

export function FlightCard({ flight, profile, showMember = true }: FlightCardProps) {
  const depTime = formatLocalTime(flight.departure_datetime_utc, flight.departure_timezone);
  const arrTime = formatLocalTime(flight.arrival_datetime_utc, flight.arrival_timezone);
  const depDate = formatLocalDateShort(flight.departure_datetime_utc, flight.departure_timezone);
  const depAbbr = getTimezoneAbbr(flight.departure_datetime_utc, flight.departure_timezone);
  const arrAbbr = getTimezoneAbbr(flight.arrival_datetime_utc, flight.arrival_timezone);
  const duration = getDurationString(flight.departure_datetime_utc, flight.arrival_datetime_utc);

  const colour = profile?.avatar_colour ?? '#64748b';

  return (
    <Link
      to={`/flights/${flight.id}`}
      className="block bg-slate-800 rounded-xl overflow-hidden hover:bg-slate-750 active:scale-[0.99] transition-all"
    >
      {/* Colour accent bar */}
      <div className="h-0.5" style={{ backgroundColor: colour }} />

      <div className="p-4">
        {/* Top row: member + date */}
        {showMember && profile && (
          <div className="flex items-center gap-2 mb-3">
            <Avatar name={profile.display_name} colour={colour} size="sm" />
            <span className="text-xs text-slate-400 font-medium">{profile.display_name}</span>
            <span className="text-xs text-slate-500 ml-auto">{depDate}</span>
          </div>
        )}
        {!showMember && (
          <div className="text-xs text-slate-500 mb-3">{depDate}</div>
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
