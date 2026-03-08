import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { getCachedHotel, cacheHotels } from '@/lib/db';
import { getMember } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { isFileCached, openFile, cacheFile } from '@/lib/fileCache';
import type { Hotel } from '@/types';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-white text-right font-medium">{value}</span>
    </div>
  );
}

function nightCount(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + 'T12:00:00Z');
  const b = new Date(checkOut + 'T12:00:00Z');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function HotelDetailPage() {
  const { hotelId } = useParams<{ hotelId: string }>();
  const navigate = useNavigate();
  const { isOnline } = useOffline();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [voucherCached, setVoucherCached] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hotelId) return;
    loadHotel();
  }, [hotelId]);

  useEffect(() => {
    if (hotel?.voucher_url) {
      isFileCached('vouchers', hotel.voucher_url).then(setVoucherCached);
    }
  }, [hotel?.voucher_url]);

  async function loadHotel() {
    setLoading(true);
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('hotels')
          .select('*')
          .eq('id', hotelId)
          .maybeSingle();
        if (error) throw error;
        setHotel(data as Hotel | null);
        if (data) await cacheHotels([data as Hotel]);
      } else {
        const cached = await getCachedHotel(hotelId!);
        setHotel(cached ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hotel.');
    } finally {
      setLoading(false);
    }
  }

  async function handleViewVoucher() {
    if (!hotel?.voucher_url) return;
    setFileLoading(true);
    try {
      await openFile('vouchers', hotel.voucher_url);
      setVoucherCached(true);
    } catch {
      setError('Failed to open voucher. Check your connection.');
    } finally {
      setFileLoading(false);
    }
  }

  async function handleCacheVoucher() {
    if (!hotel?.voucher_url) return;
    setFileLoading(true);
    try {
      await cacheFile('vouchers', hotel.voucher_url);
      setVoucherCached(true);
    } catch {
      setError('Failed to save voucher for offline access.');
    } finally {
      setFileLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout title="Hotel" hideNav>
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      </Layout>
    );
  }

  if (!hotel) {
    return (
      <Layout title="Not found" hideNav>
        <div className="text-center py-16 px-4">
          <p className="text-slate-400">
            {isOnline
              ? 'Hotel not found.'
              : "You're offline and this hotel hasn't been cached yet. Open it while online first."}
          </p>
          <button onClick={() => navigate(-1)} className="text-sky-400 text-sm mt-4">Go back</button>
        </div>
      </Layout>
    );
  }

  const member = getMember(hotel.family_member_id);
  const nights = nightCount(hotel.check_in_date, hotel.check_out_date);
  const location = [hotel.city, hotel.country].filter(Boolean).join(', ');

  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
    hotel.address ?? [hotel.hotel_name, hotel.city, hotel.country].filter(Boolean).join(', ')
  )}`;

  return (
    <Layout
      title={hotel.hotel_name}
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
              <p className="text-xs text-slate-500">Hotel</p>
            </div>
          </div>
        )}

        <h2 className="text-lg font-bold text-white">{hotel.hotel_name}</h2>

        {/* Core details */}
        <div className="bg-slate-800 rounded-xl px-4">
          {location && <Row label="Location" value={location} />}
          <Row label="Check-in" value={fmtDate(hotel.check_in_date) + (hotel.check_in_time ? ` at ${hotel.check_in_time}` : '')} />
          <Row label="Check-out" value={fmtDate(hotel.check_out_date) + (hotel.check_out_time ? ` at ${hotel.check_out_time}` : '')} />
          <Row label="Duration" value={`${nights} night${nights !== 1 ? 's' : ''}`} />
          <Row label="Room type" value={hotel.room_type} />
          <Row label="Booked under" value={hotel.booked_under} />
          <Row label="Confirmation" value={hotel.confirmation_number} />
          <Row label="Booking ref" value={hotel.booking_reference} />
          <Row label="Price" value={hotel.price} />
          <Row label="Address" value={hotel.address} />
          <Row label="Phone" value={hotel.phone} />
        </div>

        {hotel.notes && (
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-medium">Notes</p>
            <p className="text-sm text-slate-300">{hotel.notes}</p>
          </div>
        )}

        {/* Voucher */}
        {hotel.voucher_url && (
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Hotel Voucher</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${
                voucherCached
                  ? 'bg-emerald-900/60 text-emerald-400'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {voucherCached ? 'Saved offline ✓' : 'Not cached'}
              </span>
            </div>
            <div className="flex gap-3">
              <Button variant="primary" onClick={handleViewVoucher} loading={fileLoading} className="flex-1">
                View Voucher
              </Button>
              {!voucherCached && (
                <Button variant="secondary" onClick={handleCacheVoucher} loading={fileLoading}>
                  Save offline
                </Button>
              )}
            </div>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Open in Google Maps
        </a>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </Layout>
  );
}
