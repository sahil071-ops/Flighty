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

  return (
    <Link
      to={`/hotels/${hotel.id}`}
      className={`block rounded-xl overflow-hidden border active:scale-[0.99] transition-transform ${isPast ? 'opacity-50 border-slate-800' : 'bg-slate-800 border-slate-700'}`}
      style={isPast ? { backgroundColor: '#1a2030' } : undefined}
    >
      <div className="h-0.5" style={{ backgroundColor: isPast ? '#334155' : colour }} />
      <div className="p-4">
        {showMember && member && (
          <div className="flex items-center gap-2 mb-3">
            <Avatar name={member.name} colour={isPast ? '#64748b' : colour} size="sm" />
            <span className="text-xs text-slate-400 font-medium">{member.name}</span>
            {isPast && <span className="text-[10px] bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded ml-auto">Completed</span>}
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{hotel.hotel_name}</h3>
            {location && <p className="text-xs text-slate-400 mt-0.5">{location}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs font-medium text-slate-300">
              {fmtDate(hotel.check_in_date)} – {fmtDate(hotel.check_out_date)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {nights} night{nights !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
          {hotel.check_in_time && <span>Check-in {hotel.check_in_time}</span>}
          {hotel.room_type && <span className="truncate">{hotel.room_type}</span>}
          {hotel.confirmation_number && (
            <span className="font-mono ml-auto">{hotel.confirmation_number}</span>
          )}
        </div>

        {hotel.booked_under && (
          <p className="text-xs text-slate-500 mt-1">Under: {hotel.booked_under}</p>
        )}
        {hotel.price && (
          <p className="text-xs text-slate-400 mt-1 font-medium">{hotel.price}</p>
        )}
        {hotel.voucher_url && (
          <span className="text-[10px] bg-sky-900/60 text-sky-400 px-1.5 py-0.5 rounded mt-2 inline-block">
            Voucher ↗
          </span>
        )}
      </div>
    </Link>
  );
}
