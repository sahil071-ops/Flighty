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
  grouped?: boolean;
}

export function FlightCard({ flight, member, showMember = true, grouped = false }: FlightCardProps) {
  const isPast = flight.arrival_datetime_utc < new Date().toISOString();
  const depTime = formatLocalTime(flight.departure_datetime_utc, flight.departure_timezone);
  const arrTime = formatLocalTime(flight.arrival_datetime_utc, flight.arrival_timezone);
  const depDate = formatLocalDateCard(flight.departure_datetime_utc, flight.departure_timezone);
  const duration = getDurationString(flight.departure_datetime_utc, flight.arrival_datetime_utc);
  const colour = member?.colour ?? '#64748b';

  // ─── Collapsed past card ─────────────────────────────────────────────────
  if (isPast) {
    return (
      <Link
        to={`/flights/${flight.id}`}
        className={`flex items-center gap-3 py-2.5 px-3 active:opacity-60 transition-opacity ${
          grouped ? '' : 'rounded-xl border dark:border-white/[.05] border-black/[.05] dark:bg-slate-900/60 bg-black/[.03]'
        }`}
      >
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-25" style={{ backgroundColor: colour }} />
        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
          <span className="font-mono text-[12px] text-slate-500 line-through tabular-nums whitespace-nowrap">
            {flight.departure_airport_code} → {flight.arrival_airport_code}
          </span>
          <span className="text-[11px] text-slate-500 line-through tabular-nums hidden sm:inline whitespace-nowrap">
            {depTime} – {arrTime}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-slate-500">{depDate}</span>
          {showMember && member && (
            <Avatar name={member.name} colour={colour} size="xs" className="opacity-40" />
          )}
        </div>
      </Link>
    );
  }

  // ─── Full active card ─────────────────────────────────────────────────────
  const depAbbr = getTimezoneAbbr(flight.departure_datetime_utc, flight.departure_timezone);
  const arrAbbr = getTimezoneAbbr(flight.arrival_datetime_utc, flight.arrival_timezone);

  return (
    <Link
      to={`/flights/${flight.id}`}
      className={`flex overflow-hidden active:scale-[0.99] transition-all duration-150 lm-card ${
        grouped
          ? 'rounded-none dark:border-white/[.05] border-black/[.05] border-b'
          : 'rounded-xl dark:border-white/[.07] border-black/[.07] border dark:hover:border-white/[.14] hover:border-black/[.14]'
      } bg-slate-800`}
    >
      {/* Left accent bar */}
      {!grouped && (
        <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: colour }} />
      )}

      <div className="flex-1 p-4">
        {/* Member + date */}
        {showMember && member ? (
          <div className="flex items-center gap-2 mb-3.5">
            <Avatar name={member.name} colour={colour} size="sm" memberId={member.id} />
            <span className="text-[12px] text-slate-400 font-medium">{member.name}</span>
            <span className="text-[12px] font-medium text-slate-400 ml-auto">{depDate}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-[12px] font-medium text-slate-400">{depDate}</div>
          </div>
        )}

        {/* Route */}
        <div className="flex items-center gap-2">
          <div className="text-left min-w-0">
            <div className="text-[28px] font-bold tracking-tightest text-white tabular-nums leading-none">{depTime}</div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-mono text-[13px] font-semibold text-slate-200 tracking-wide">{flight.departure_airport_code}</span>
              <span className="text-[10px] text-slate-500">{depAbbr}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center gap-1 px-1 min-w-0">
            <span className="text-[10px] text-slate-500 font-mono tracking-wide">{flight.flight_number}</span>
            <div className="w-full flex items-center gap-1.5">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
              <svg className="w-[14px] h-[14px] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: colour }}>
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
            </div>
            {duration && <span className="text-[10px] text-slate-500">{duration}</span>}
          </div>

          <div className="text-right min-w-0">
            <div className="text-[28px] font-bold tracking-tightest text-white tabular-nums leading-none">{arrTime}</div>
            <div className="flex items-baseline gap-1 mt-1 justify-end">
              <span className="font-mono text-[13px] font-semibold text-slate-200 tracking-wide">{flight.arrival_airport_code}</span>
              <span className="text-[10px] text-slate-500">{arrAbbr}</span>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex items-center justify-between mt-3.5 pt-3 border-t dark:border-white/[.05] border-black/[.05]">
          <span className="text-[12px] text-slate-500 truncate">{flight.airline ?? flight.flight_number}</span>
          <div className="flex items-center gap-2">
            {flight.booking_reference && (
              <span className="text-[11px] text-slate-500 font-mono">{flight.booking_reference}</span>
            )}
            {flight.ticket_pdf_url && (
              <span className="text-[10px] font-semibold bg-cyan-400/10 text-cyan-500 px-2 py-0.5 rounded-md">PDF</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
