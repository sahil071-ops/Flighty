import { Link } from 'react-router-dom';
import type { Hotel } from '@/types';
import type { Member } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';

interface HotelCardProps {
  hotel: Hotel;
  member?: Member;
  showMember?: boolean;
}

function nightCount(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + 'T12:00:00Z');
  const b = new Date(checkOut + 'T12:00:00Z');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  });
}

export function HotelCard({ hotel, member, showMember = true }: HotelCardProps) {
  const colour = member?.colour ?? '#64748b';
  const nights = nightCount(hotel.check_in_date, hotel.check_out_date);
  const location = [hotel.city, hotel.country].filter(Boolean).join(', ');
  const today = new Date().toISOString().slice(0, 10);
  const isPast = hotel.check_out_date < today;

  // ─── Collapsed past card ──────────────────────────────────────────────────
  if (isPast) {
    return (
      <Link
        to={`/hotels/${hotel.id}`}
        className="flex items-center gap-3 py-2.5 px-3 rounded-xl border dark:border-white/[.05] border-black/[.05] dark:bg-slate-900/60 bg-black/[.03] active:opacity-60 transition-opacity"
      >
        {/* Hotel icon dot */}
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-30" style={{ backgroundColor: colour }} />

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-[12px] text-slate-600 line-through truncate">
            {hotel.hotel_name}
          </span>
          {location && (
            <span className="text-[11px] text-slate-700 line-through hidden sm:inline">{location}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-slate-700">
            {fmtDate(hotel.check_in_date)} – {fmtDate(hotel.check_out_date)}
          </span>
          {showMember && member && (
            <Avatar name={member.name} colour="#334155" size="xs" />
          )}
        </div>
      </Link>
    );
  }

  // ─── Full active card ─────────────────────────────────────────────────────
  return (
    <Link
      to={`/hotels/${hotel.id}`}
      className="flex rounded-xl overflow-hidden border dark:border-white/[.07] border-black/[.07] dark:hover:border-white/[.13] hover:border-black/[.13] active:scale-[0.99] transition-all shadow-card bg-slate-800"
    >
      {/* Left accent */}
      <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: colour }} />

      <div className="flex-1 p-4">
        {showMember && member && (
          <div className="flex items-center gap-2 mb-3">
            <Avatar name={member.name} colour={colour} size="sm" memberId={member.id} />
            <span className="text-xs text-slate-400 font-medium">{member.name}</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-semibold tracking-tight text-white truncate">{hotel.hotel_name}</h3>
            {location && <p className="text-[12px] text-slate-500 mt-0.5">{location}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[12px] font-medium text-slate-300">
              {fmtDate(hotel.check_in_date)} – {fmtDate(hotel.check_out_date)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {nights} night{nights !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t dark:border-white/[.05] border-black/[.05] text-[12px] text-slate-500">
          {hotel.check_in_time && <span>Check-in {hotel.check_in_time}</span>}
          {hotel.room_type && <span className="truncate">{hotel.room_type}</span>}
          {hotel.confirmation_number && (
            <span className="font-mono ml-auto text-slate-600">{hotel.confirmation_number}</span>
          )}
        </div>

        {hotel.voucher_url && (
          <span className="text-[10px] font-semibold bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded-md mt-2 inline-block">
            Voucher ↗
          </span>
        )}
      </div>
    </Link>
  );
}
