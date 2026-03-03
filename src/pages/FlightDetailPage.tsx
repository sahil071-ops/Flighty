import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { getCachedFlight, getCachedProfiles, deleteCachedFlight } from '@/lib/db';
import { Layout } from '@/components/layout/Layout';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { downloadICS } from '@/lib/icsGenerator';
import { isPDFCached, openPDFBlob, downloadPDF } from '@/lib/pdfCache';
import {
  formatLocalTime,
  formatLocalDate,
  getTimezoneAbbr,
  getDurationString,
} from '@/lib/timezone';
import type { Flight, Profile } from '@/types';

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-white text-right font-medium">{value}</span>
    </div>
  );
}

export function FlightDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isOnline } = useOffline();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [member, setMember] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfCached, setPdfCached] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadFlight();
  }, [id]);

  async function loadFlight() {
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('flights')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        setFlight(data);
        if (data) {
          const { data: p } = await supabase.from('profiles').select('*').eq('id', data.family_member_id).maybeSingle();
          setMember(p);
        }
      } else {
        const f = await getCachedFlight(id!);
        setFlight(f ?? null);
        if (f) {
          const profiles = await getCachedProfiles();
          setMember(profiles.find(p => p.id === f.family_member_id) ?? null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flight.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (flight?.ticket_pdf_url) {
      isPDFCached(flight.ticket_pdf_url).then(setPdfCached);
    }
  }, [flight?.ticket_pdf_url]);

  async function handleViewTicket() {
    if (!flight?.ticket_pdf_url) return;
    setPdfLoading(true);
    try {
      await openPDFBlob(flight.ticket_pdf_url);
      setPdfCached(true);
    } catch {
      setError('Failed to open PDF. Check your connection.');
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDownloadTicket() {
    if (!flight?.ticket_pdf_url) return;
    setPdfLoading(true);
    try {
      const filename = `${flight.flight_number}-ticket.pdf`;
      await downloadPDF(flight.ticket_pdf_url, filename);
      setPdfCached(true);
    } catch {
      setError('Failed to download PDF.');
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDelete() {
    if (!flight) return;
    if (!confirm('Delete this flight? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('flights').delete().eq('id', flight.id);
      if (error) throw error;
      await deleteCachedFlight(flight.id);
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete.');
      setDeleting(false);
    }
  }

  function handleWhatsApp() {
    if (!flight) return;
    const depTime = formatLocalTime(flight.departure_datetime_utc, flight.departure_timezone);
    const arrTime = formatLocalTime(flight.arrival_datetime_utc, flight.arrival_timezone);
    const depAbbr = getTimezoneAbbr(flight.departure_datetime_utc, flight.departure_timezone);
    const arrAbbr = getTimezoneAbbr(flight.arrival_datetime_utc, flight.arrival_timezone);
    const depDate = formatLocalDate(flight.departure_datetime_utc, flight.departure_timezone);

    const lines = [
      `✈️ *${flight.flight_number}*${flight.airline ? ` – ${flight.airline}` : ''}`,
      `${flight.departure_airport_code} → ${flight.arrival_airport_code}`,
      `📅 ${depDate}`,
      `🛫 ${depTime} ${depAbbr} → 🛬 ${arrTime} ${arrAbbr}`,
      flight.booking_reference ? `📋 Ref: ${flight.booking_reference}` : null,
      flight.seat ? `💺 Seat: ${flight.seat}` : null,
      member ? `👤 Passenger: ${member.display_name}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const url = `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, '_blank');
  }

  const canEdit =
    profile?.is_admin || (flight && flight.family_member_id === profile?.id);

  if (loading) {
    return (
      <Layout title="Flight details">
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!flight) {
    return (
      <Layout title="Flight not found">
        <div className="text-center py-16 px-4">
          <p className="text-slate-400">This flight could not be found.</p>
          <button onClick={() => navigate(-1)} className="text-sky-400 text-sm mt-4">
            Go back
          </button>
        </div>
      </Layout>
    );
  }

  const depTime = formatLocalTime(flight.departure_datetime_utc, flight.departure_timezone);
  const arrTime = formatLocalTime(flight.arrival_datetime_utc, flight.arrival_timezone);
  const depDate = formatLocalDate(flight.departure_datetime_utc, flight.departure_timezone);
  const depAbbr = getTimezoneAbbr(flight.departure_datetime_utc, flight.departure_timezone);
  const arrAbbr = getTimezoneAbbr(flight.arrival_datetime_utc, flight.arrival_timezone);
  const duration = getDurationString(flight.departure_datetime_utc, flight.arrival_datetime_utc);

  return (
    <Layout
      title={`${flight.flight_number}`}
      headerRight={
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-2 -mr-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    >
      <div className="px-4 py-4 pb-8">
        {/* Member */}
        {member && (
          <div className="flex items-center gap-3 mb-5">
            <Avatar name={member.display_name} colour={member.avatar_colour} size="md" />
            <div>
              <div className="text-sm font-medium text-white">{member.display_name}</div>
              {flight.trip_name && <div className="text-xs text-slate-500">{flight.trip_name}</div>}
            </div>
          </div>
        )}

        {/* Route header */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{ background: `linear-gradient(135deg, ${member?.avatar_colour ?? '#0ea5e9'}22, transparent)`, border: `1px solid ${member?.avatar_colour ?? '#0ea5e9'}33` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-bold text-white">{depTime}</div>
              <div className="text-lg font-mono text-slate-300 mt-1">{flight.departure_airport_code}</div>
              <div className="text-xs text-slate-500">{depAbbr}</div>
            </div>
            <div className="flex flex-col items-center gap-1 px-4">
              <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
              {duration && <div className="text-xs text-slate-500">{duration}</div>}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">{arrTime}</div>
              <div className="text-lg font-mono text-slate-300 mt-1">{flight.arrival_airport_code}</div>
              <div className="text-xs text-slate-500">{arrAbbr}</div>
            </div>
          </div>
          <div className="text-xs text-slate-400">{depDate}</div>
          {flight.airline && <div className="text-sm text-slate-300 mt-1">{flight.airline}</div>}
        </div>

        {/* Details */}
        <div className="bg-slate-800 rounded-xl px-4 mb-5">
          <DetailRow label="Departure airport" value={flight.departure_airport_name ?? flight.departure_airport_code} />
          <DetailRow label="Departure terminal" value={flight.terminal_departure} />
          <DetailRow label="Gate" value={flight.gate} />
          <DetailRow label="Arrival airport" value={flight.arrival_airport_name ?? flight.arrival_airport_code} />
          <DetailRow label="Arrival terminal" value={flight.terminal_arrival} />
          <DetailRow label="Seat" value={flight.seat} />
          <DetailRow label="Booking reference" value={flight.booking_reference} />
          <DetailRow label="Price" value={flight.price} />
          <DetailRow label="Notes" value={flight.notes} />
        </div>

        {/* Ticket PDF */}
        {flight.ticket_pdf_url && (
          <div className="bg-slate-800 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Ticket PDF</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${pdfCached ? 'bg-emerald-900/60 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                {pdfCached ? 'Available offline' : 'Not cached'}
              </span>
            </div>
            {!pdfCached && (
              <p className="text-xs text-slate-500 mb-3">Tap View Ticket to save for offline access.</p>
            )}
            <div className="flex gap-3">
              <Button variant="primary" onClick={handleViewTicket} loading={pdfLoading} className="flex-1">
                View Ticket
              </Button>
              <Button variant="secondary" onClick={handleDownloadTicket} loading={pdfLoading}>
                Download
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-sm text-red-300 mb-5">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => downloadICS(flight, member?.display_name ?? 'Passenger')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Add to Calendar
          </Button>

          <Button
            variant="secondary"
            className="w-full"
            onClick={handleWhatsApp}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.529 5.858L0 24l6.337-1.502A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.669-.511-5.198-1.4l-.374-.222-3.762.892.943-3.663-.241-.387A9.952 9.952 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            Share via WhatsApp
          </Button>

          {canEdit && isOnline && (
            <>
              <Link
                to={`/flights/${flight.id}/edit`}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit flight
              </Link>
              <Button
                variant="danger"
                className="w-full"
                onClick={handleDelete}
                loading={deleting}
              >
                Delete flight
              </Button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
