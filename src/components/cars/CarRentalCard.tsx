import { Link } from 'react-router-dom';
import type { CarRental } from '@/types';
import type { Member } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';

interface CarRentalCardProps {
  rental: CarRental;
  member?: Member;
  showMember?: boolean;
}

function rentalDays(pickupDate: string, dropoffDate: string): number {
  const a = new Date(pickupDate + 'T12:00:00Z');
  const b = new Date(dropoffDate + 'T12:00:00Z');
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  });
}

export function CarRentalCard({ rental, member, showMember = true }: CarRentalCardProps) {
  const colour = member?.colour ?? '#64748b';
  const days = rentalDays(rental.pickup_date, rental.dropoff_date);
  const sameLocation =
    !rental.dropoff_location ||
    rental.dropoff_location.trim().toLowerCase() === rental.pickup_location.trim().toLowerCase();

  return (
    <Link
      to={`/car-rentals/${rental.id}`}
      className="block bg-slate-800 rounded-xl overflow-hidden border border-slate-700 active:scale-[0.99] transition-transform"
    >
      <div className="h-0.5" style={{ backgroundColor: colour }} />
      <div className="p-4">
        {showMember && member && (
          <div className="flex items-center gap-2 mb-3">
            <Avatar name={member.name} colour={colour} size="sm" />
            <span className="text-xs text-slate-400 font-medium">{member.name}</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <h3 className="text-sm font-semibold text-white truncate">{rental.company}</h3>
            </div>
            {rental.car_type && (
              <p className="text-xs text-slate-400 mt-0.5 pl-6">{rental.car_type}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs font-medium text-slate-300">
              {fmtDate(rental.pickup_date)} – {fmtDate(rental.dropoff_date)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {days} day{days !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500 space-y-0.5">
          <p className="truncate">
            <span className="text-slate-600">Pick-up: </span>{rental.pickup_location}
            {rental.pickup_time && <span className="ml-1">· {rental.pickup_time}</span>}
          </p>
          {!sameLocation && rental.dropoff_location && (
            <p className="truncate">
              <span className="text-slate-600">Drop-off: </span>{rental.dropoff_location}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          {rental.confirmation_number && (
            <span className="font-mono">{rental.confirmation_number}</span>
          )}
          {rental.price && (
            <span className="text-slate-400 font-medium ml-auto">{rental.price}</span>
          )}
        </div>

        {rental.voucher_url && (
          <span className="text-[10px] bg-sky-900/60 text-sky-400 px-1.5 py-0.5 rounded mt-2 inline-block">
            Voucher ↗
          </span>
        )}
      </div>
    </Link>
  );
}
