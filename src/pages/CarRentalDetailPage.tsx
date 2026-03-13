import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { getCachedCarRental } from '@/lib/db';
import { getMember } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { CarRental } from '@/types';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-white text-right font-medium">{value}</span>
    </div>
  );
}

function rentalDays(pickupDate: string, dropoffDate: string): number {
  const a = new Date(pickupDate + 'T12:00:00Z');
  const b = new Date(dropoffDate + 'T12:00:00Z');
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
}

export function CarRentalDetailPage() {
  const { rentalId } = useParams<{ rentalId: string }>();
  const navigate = useNavigate();
  const { isOnline } = useOffline();
  const [rental, setRental] = useState<CarRental | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rentalId) loadRental();
  }, [rentalId]);

  async function loadRental() {
    setLoading(true);
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('car_rentals')
          .select('*')
          .eq('id', rentalId)
          .maybeSingle();
        if (error) throw error;
        setRental(data as CarRental | null);
      } else {
        const cached = await getCachedCarRental(rentalId!);
        setRental(cached ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load car rental.');
    } finally {
      setLoading(false);
    }
  }

  async function handleViewVoucher() {
    if (!rental?.voucher_url) return;
    setFileLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('vouchers')
        .createSignedUrl(rental.voucher_url, 120);
      if (error || !data?.signedUrl) throw new Error('Could not generate file URL');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Failed to open voucher. Check your connection.');
    } finally {
      setFileLoading(false);
    }
  }

  async function handleDelete() {
    if (!rental) return;
    if (!confirm('Delete this car rental? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('car_rentals').delete().eq('id', rental.id);
      if (error) throw error;
      if (rental.voucher_url) {
        await supabase.storage.from('vouchers').remove([rental.voucher_url]);
      }
      navigate(`/trips/${rental.trip_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete.');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Layout title="Car Rental" hideNav>
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      </Layout>
    );
  }

  if (!rental) {
    return (
      <Layout title="Not found" hideNav>
        <div className="text-center py-16 px-4">
          <p className="text-slate-400">
            {isOnline ? 'Car rental not found.' : "You're offline and this hasn't been cached yet."}
          </p>
          <button onClick={() => navigate(-1)} className="text-sky-400 text-sm mt-4">Go back</button>
        </div>
      </Layout>
    );
  }

  const member = getMember(rental.family_member_id);
  const days = rentalDays(rental.pickup_date, rental.dropoff_date);
  const sameLocation =
    !rental.dropoff_location ||
    rental.dropoff_location.trim().toLowerCase() === rental.pickup_location.trim().toLowerCase();

  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(rental.pickup_location)}`;

  return (
    <Layout
      title="Car Rental"
      hideNav
      headerRight={
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white p-3 -mr-3 flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    >
      <div className="px-4 py-4 pb-8 flex flex-col gap-5">
        {/* Member header */}
        {member && (
          <div className="flex items-center gap-3">
            <Avatar name={member.name} colour={member.colour} size="md" />
            <div>
              <p className="text-sm font-medium text-white">{member.name}</p>
              <p className="text-xs text-slate-500">Car Rental</p>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold text-white">{rental.company}</h2>
          {rental.car_type && <p className="text-sm text-slate-400 mt-0.5">{rental.car_type}</p>}
        </div>

        {/* Pick-up / Drop-off */}
        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Pick-up</p>
            <p className="text-sm font-medium text-white">{rental.pickup_location}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {rental.pickup_date}{rental.pickup_time ? ` · ${rental.pickup_time}` : ''}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Drop-off</p>
            <p className="text-sm font-medium text-white">
              {sameLocation ? rental.pickup_location : (rental.dropoff_location ?? rental.pickup_location)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {rental.dropoff_date}{rental.dropoff_time ? ` · ${rental.dropoff_time}` : ''}
              {' · '}{days} day{days !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="bg-slate-800 rounded-xl px-4">
          <Row label="Confirmation" value={rental.confirmation_number} />
          <Row label="Booking reference" value={rental.booking_reference} />
          <Row label="Main driver" value={rental.driver_name} />
          <Row label="Price" value={rental.price} />
        </div>

        {rental.notes && (
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-medium">Notes</p>
            <p className="text-sm text-slate-300">{rental.notes}</p>
          </div>
        )}

        {/* Voucher */}
        {rental.voucher_url && (
          <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-white">Rental Voucher</h3>
            <Button variant="primary" onClick={handleViewVoucher} loading={fileLoading}>
              View Voucher
            </Button>
          </div>
        )}

        {/* Open in Maps */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold rounded-xl py-3 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Open Pick-up Location in Maps
        </a>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-sm text-red-300">{error}</div>
        )}

        {isOnline && (
          <Button variant="danger" className="w-full" onClick={handleDelete} loading={deleting}>
            Delete car rental
          </Button>
        )}
      </div>
    </Layout>
  );
}
