import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import {
  getCachedTrip, getCachedFlights, getCachedHotels, getCachedCarRentals,
  cacheTrips, cacheFlights, cacheHotels, cacheCarRentals,
} from '@/lib/db';
import { getMember } from '@/data/members';
import { Layout } from '@/components/layout/Layout';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { FlightCard } from '@/components/flights/FlightCard';
import { HotelCard } from '@/components/hotels/HotelCard';
import { CarRentalCard } from '@/components/cars/CarRentalCard';
import { downloadICS } from '@/lib/icsGenerator';
import { getDurationString, formatLocalTime, getTimezoneAbbr } from '@/lib/timezone';
import type { Trip, Flight, Hotel, CarRental, MemberDocument } from '@/types';

// ── Layover block ──────────────────────────────────────────────────────────────

/** Only show a layover block when flights are connected legs of the same trip. */
function shouldShowLayover(prev: Flight, next: Flight): boolean {
  if (prev.trip_id !== next.trip_id) return false;
  if (prev.arrival_airport_code !== next.departure_airport_code) return false;
  const gapMs = new Date(next.departure_datetime_utc).getTime() - new Date(prev.arrival_datetime_utc).getTime();
  return gapMs > 0 && gapMs < 24 * 60 * 60 * 1000;
}

function LayoverBlock({ prev, next }: { prev: Flight; next: Flight }) {
  const durationStr = getDurationString(prev.arrival_datetime_utc, next.departure_datetime_utc);
  const city = prev.arrival_city ?? prev.arrival_airport_code;

  const diffMs = new Date(next.departure_datetime_utc).getTime() - new Date(prev.arrival_datetime_utc).getTime();
  const diffMins = diffMs / 60000;

  const isWarning = diffMins < 60;
  const isLong = diffMins >= 8 * 60;

  const colourClass = isWarning ? 'text-amber-400' : 'text-slate-500';
  const label = isLong ? 'Long layover' : `${durationStr} layover`;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/60">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isWarning ? 'bg-amber-400' : 'bg-slate-600'}`} />
      <span className={`text-xs flex-1 ${colourClass}`}>
        {label} in {city}
        {isWarning && <span className="ml-1.5">⚠️ short connection</span>}
      </span>
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isWarning ? 'bg-amber-400' : 'bg-slate-600'}`} />
    </div>
  );
}

// ── Trip notes section ─────────────────────────────────────────────────────────

function NotesSection({ trip, canEdit, onSave }: {
  trip: Trip;
  canEdit: boolean;
  onSave: (notes: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(trip.notes ?? '');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const lastEdited = trip.notes_last_edited_by
    ? `Last edited by ${trip.notes_last_edited_by}${trip.notes_last_edited_at
        ? ' · ' + new Date(trip.notes_last_edited_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : ''
      }`
    : null;

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-white">Notes</h3>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-sky-400 hover:text-sky-300">
            {trip.notes ? 'Edit' : 'Add notes'}
          </button>
        )}
      </div>
      <div className="px-4 py-3">
        {editing ? (
          <div className="flex flex-col gap-3">
            <textarea
              ref={textareaRef}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-full resize-none"
              rows={5}
              placeholder="Shared notes — visible to all family members. E.g. hotel is Taj, room under Manmayee, visa on arrival, bring USD cash…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={save} loading={saving} size="sm" className="flex-1">Save</Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setDraft(trip.notes ?? ''); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : trip.notes ? (
          <div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{trip.notes}</p>
            {lastEdited && <p className="text-[11px] text-slate-600 mt-2">{lastEdited}</p>}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No notes yet.{canEdit ? ' Tap "Add notes" to share info with the family.' : ''}</p>
        )}
      </div>
    </div>
  );
}

// ── Linked document row ────────────────────────────────────────────────────────

const DOC_TYPE_LABEL: Record<string, string> = {
  passport: 'Passport',
  visa: 'Visa',
  travel_insurance: 'Travel Insurance',
  other: 'Other',
};

interface LinkedDoc { link_id: string; doc: MemberDocument }

function LinkedDocRow({ linked, onUnlink, canEdit }: {
  linked: LinkedDoc;
  onUnlink: (linkId: string) => void;
  canEdit: boolean;
}) {
  const { doc } = linked;
  const member = getMember(doc.family_member_id);
  const navigate = useNavigate();
  return (
    <div
      className="flex items-center gap-3 py-3 border-b border-slate-800 last:border-0 cursor-pointer"
      onClick={() => navigate(`/documents/view/${doc.id}`)}
    >
      <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{doc.label}</p>
        <p className="text-xs text-slate-500">
          {DOC_TYPE_LABEL[doc.document_type] ?? doc.document_type}
          {member ? ` · ${member.name}` : ''}
          {doc.expiry_date ? ` · exp ${new Date(doc.expiry_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
        </p>
      </div>
      {canEdit && (
        <button
          onClick={e => { e.stopPropagation(); onUnlink(linked.link_id); }}
          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-red-400 flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { currentMember } = useApp();
  const { isOnline } = useOffline();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [carRentals, setCarRentals] = useState<CarRental[]>([]);
  const [linkedDocs, setLinkedDocs] = useState<LinkedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [pickerDocs, setPickerDocs] = useState<MemberDocument[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => { if (tripId) load(); }, [tripId, isOnline]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (isOnline) {
        const [tripRes, flightsRes, hotelsRes, carRentalsRes, linksRes] = await Promise.all([
          supabase.from('trips').select('*').eq('id', tripId!).maybeSingle(),
          supabase.from('flights').select('*').eq('trip_id', tripId!),
          supabase.from('hotels').select('*').eq('trip_id', tripId!).order('check_in_date'),
          supabase.from('car_rentals').select('*').eq('trip_id', tripId!).order('pickup_date'),
          supabase.from('trip_document_links').select('id, member_documents(*)').eq('trip_id', tripId!),
        ]);
        setTrip(tripRes.data);
        setFlights((flightsRes.data ?? []).sort((a, b) =>
          a.departure_datetime_utc.localeCompare(b.departure_datetime_utc)
        ));
        setHotels((hotelsRes.data ?? []).sort((a, b) => a.check_in_date.localeCompare(b.check_in_date)));
        setCarRentals((carRentalsRes.data ?? []) as CarRental[]);
        setLinkedDocs(
          (linksRes.data ?? [])
            .filter(r => r.member_documents)
            .map(r => ({ link_id: r.id, doc: r.member_documents as unknown as MemberDocument }))
        );
        // Write to IndexedDB for offline access
        const writes: Promise<void>[] = [];
        if (tripRes.data) writes.push(cacheTrips([tripRes.data]));
        if (flightsRes.data?.length) writes.push(cacheFlights(flightsRes.data));
        if (hotelsRes.data?.length) writes.push(cacheHotels(hotelsRes.data));
        if (carRentalsRes.data?.length) writes.push(cacheCarRentals(carRentalsRes.data as CarRental[]));
        Promise.all(writes).catch(() => { /* non-critical */ });
      } else {
        const [cachedTrip, cachedFlights, cachedHotels, cachedRentals] = await Promise.all([
          getCachedTrip(tripId!),
          getCachedFlights(),
          getCachedHotels(),
          getCachedCarRentals(),
        ]);
        setTrip(cachedTrip ?? null);
        setFlights(cachedFlights.filter(f => f.trip_id === tripId).sort((a, b) =>
          a.departure_datetime_utc.localeCompare(b.departure_datetime_utc)
        ));
        setHotels(cachedHotels.filter(h => h.trip_id === tripId).sort((a, b) => a.check_in_date.localeCompare(b.check_in_date)));
        setCarRentals(cachedRentals.filter(r => r.trip_id === tripId));
        setLinkedDocs([]); // not cached offline
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trip.');
    } finally {
      setLoading(false);
    }
  }

  async function saveNotes(notes: string) {
    if (!trip) return;
    const { error } = await supabase.from('trips').update({
      notes,
      notes_last_edited_by: currentMember?.name ?? 'Someone',
      notes_last_edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', trip.id);
    if (error) throw error;
    setTrip(t => t ? { ...t, notes, notes_last_edited_by: currentMember?.name ?? 'Someone', notes_last_edited_at: new Date().toISOString() } : t);
  }

  async function openLinkPicker() {
    if (!trip) return;
    setPickerLoading(true);
    setShowLinkPicker(true);
    try {
      const { data } = await supabase
        .from('member_documents')
        .select('*')
        .in('family_member_id', trip.family_member_ids)
        .order('family_member_id')
        .order('document_type');
      setPickerDocs(data ?? []);
    } finally {
      setPickerLoading(false);
    }
  }

  async function toggleLink(memberDocId: string) {
    if (!tripId) return;
    setLinking(memberDocId);
    try {
      const existing = linkedDocs.find(l => l.doc.id === memberDocId);
      if (existing) {
        await supabase.from('trip_document_links').delete().eq('id', existing.link_id);
        setLinkedDocs(prev => prev.filter(l => l.link_id !== existing.link_id));
      } else {
        const { data, error: insertErr } = await supabase.from('trip_document_links')
          .insert({ trip_id: tripId, member_document_id: memberDocId })
          .select('id, member_documents(*)')
          .single();
        if (insertErr) throw insertErr;
        if (data?.member_documents) {
          setLinkedDocs(prev => [...prev, { link_id: data.id, doc: data.member_documents as unknown as MemberDocument }]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document link.');
    } finally {
      setLinking(null);
    }
  }

  async function handleDeleteTrip() {
    if (!trip) return;
    if (!confirm(`Delete "${trip.name}"? This will also delete all flights, hotels and documents in this trip.`)) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('trips').delete().eq('id', trip.id);
      if (error) throw error;
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip.');
      setDeleting(false);
    }
  }

  function handleWhatsApp() {
    if (!trip) return;
    const lines: string[] = [`✈️ *${trip.name}*`];

    if (flights.length > 0) {
      lines.push('\n*Flights:*');
      for (const f of flights) {
        const memberName = getMember(f.family_member_id)?.name ?? f.family_member_id;
        const depTime = formatLocalTime(f.departure_datetime_utc, f.departure_timezone);
        const arrTime = formatLocalTime(f.arrival_datetime_utc, f.arrival_timezone);
        const depAbbr = getTimezoneAbbr(f.departure_datetime_utc, f.departure_timezone);
        lines.push(`${f.departure_airport_code} → ${f.arrival_airport_code} · ${f.flight_number} · ${depTime} ${depAbbr} → ${arrTime} · ${memberName}${f.seat ? ` · Seat ${f.seat}` : ''}`);
      }
    }

    if (hotels.length > 0) {
      lines.push('\n*Hotels:*');
      for (const h of hotels) {
        const memberName = getMember(h.family_member_id)?.name ?? h.family_member_id;
        lines.push(`${h.hotel_name}${h.city ? `, ${h.city}` : ''} · Check-in ${h.check_in_date} → ${h.check_out_date} · ${memberName}${h.confirmation_number ? ` · Ref: ${h.confirmation_number}` : ''}`);
      }
    }

    if (carRentals.length > 0) {
      lines.push('\n*Car Rentals:*');
      for (const r of carRentals) {
        const memberName = getMember(r.family_member_id)?.name ?? r.family_member_id;
        lines.push(`${r.company}${r.car_type ? ` (${r.car_type})` : ''} · Pick-up ${r.pickup_date} → ${r.dropoff_date} · ${memberName}${r.confirmation_number ? ` · Ref: ${r.confirmation_number}` : ''}`);
      }
    }

    if (trip.notes) {
      lines.push(`\n*Notes:*\n${trip.notes}`);
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  }

  if (loading) {
    return (
      <Layout title="Trip" hideNav>
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      </Layout>
    );
  }

  if (!trip) {
    return (
      <Layout title="Trip not found" hideNav>
        <div className="text-center py-16 px-4">
          <p className="text-slate-400">
            {isOnline
              ? 'This trip could not be found.'
              : "You're offline and this trip hasn't been cached yet. Open it while online first."}
          </p>
          <button onClick={() => navigate(-1)} className="text-sky-400 text-sm mt-4">Go back</button>
        </div>
      </Layout>
    );
  }

  const members = trip.family_member_ids.map(id => getMember(id)).filter(Boolean);
  const primaryColour = members[0]?.colour ?? '#64748b';

  return (
    <Layout
      title=""
      hideNav
      headerRight={
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-3 -mr-3 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    >
      <div className="flex flex-col gap-4 px-4 py-4 pb-8">

        {/* Trip header */}
        <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${primaryColour}22, transparent)`, border: `1px solid ${primaryColour}33` }}>
          <h1 className="text-xl font-bold text-white mb-1">{trip.name}</h1>
          <p className="text-sm text-slate-400">
            {new Date(trip.start_date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            {trip.end_date && ` – ${new Date(trip.end_date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
          </p>
          <div className="flex items-center gap-2 mt-3">
            {members.map(m => m && (
              <div key={m.id} className="flex items-center gap-1.5">
                <Avatar name={m.name} colour={m.colour} size="sm" />
                <span className="text-xs text-slate-300">{m.name}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-sm text-red-300">{error}</div>
        )}

        {/* ── Flights ── */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Flights</h2>
          {isOnline && (
            <Link to={`/trips/${trip.id}/flights/add`} className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add flight
            </Link>
          )}
        </div>

        {flights.length === 0 ? (
          <p className="text-sm text-slate-500 pl-1">No flights added yet.</p>
        ) : (
          <div className="rounded-xl overflow-hidden border border-slate-700" style={{ borderLeftColor: primaryColour, borderLeftWidth: 3 }}>
            {flights.map((f, idx) => (
              <div key={f.id}>
                <FlightCard flight={f} member={getMember(f.family_member_id)} showMember={members.length > 1} grouped />
                {idx < flights.length - 1 && shouldShowLayover(f, flights[idx + 1]) && <LayoverBlock prev={f} next={flights[idx + 1]} />}
              </div>
            ))}
          </div>
        )}

        {/* ── Hotels ── */}
        <div className="flex items-center justify-between mt-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hotels</h2>
          {isOnline && (
            <Link to={`/trips/${trip.id}/hotels/add`} className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add hotel
            </Link>
          )}
        </div>

        {hotels.length === 0 ? (
          <p className="text-sm text-slate-500 pl-1">No hotels added yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {hotels.map(h => (
              <HotelCard key={h.id} hotel={h} member={getMember(h.family_member_id)} showMember={members.length > 1} />
            ))}
          </div>
        )}

        {/* ── Car Rentals ── */}
        <div className="flex items-center justify-between mt-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Car Rentals</h2>
          {isOnline && (
            <Link to={`/trips/${trip.id}/car-rentals/add`} className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add car rental
            </Link>
          )}
        </div>

        {carRentals.length === 0 ? (
          <p className="text-sm text-slate-500 pl-1">No car rentals added yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {carRentals.map(r => (
              <CarRentalCard key={r.id} rental={r} member={getMember(r.family_member_id)} showMember={members.length > 1} />
            ))}
          </div>
        )}

        {/* ── Documents ── */}
        <div className="flex items-center justify-between mt-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Documents</h2>
          {isOnline && (
            <button onClick={openLinkPicker} className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Link document
            </button>
          )}
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700">
          {linkedDocs.length > 0 ? (
            <div className="px-4">
              {linkedDocs.map(l => (
                <LinkedDocRow
                  key={l.link_id}
                  linked={l}
                  canEdit={isOnline}
                  onUnlink={async linkId => {
                    await supabase.from('trip_document_links').delete().eq('id', linkId);
                    setLinkedDocs(prev => prev.filter(d => d.link_id !== linkId));
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 px-4 py-3">
              {isOnline ? 'No documents linked. Tap "+ Link document" to attach documents from the Documents tab.' : 'No documents cached for offline.'}
            </p>
          )}
        </div>

        {/* ── Link document picker ── */}
        {showLinkPicker && (
          <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowLinkPicker(false)}>
            <div className="mt-auto bg-slate-900 rounded-t-2xl border-t border-slate-700 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                <h3 className="text-sm font-semibold text-white">Link a document</h3>
                <button onClick={() => setShowLinkPicker(false)} className="text-slate-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-4 py-3">
                {pickerLoading ? (
                  <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
                ) : pickerDocs.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    No documents found for this trip's members.{' '}
                    <Link to="/documents/add" className="text-sky-400">Add one in the Documents tab.</Link>
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {pickerDocs.map(doc => {
                      const member = getMember(doc.family_member_id);
                      const isLinked = linkedDocs.some(l => l.doc.id === doc.id);
                      const isLoading = linking === doc.id;
                      return (
                        <button
                          key={doc.id}
                          onClick={() => toggleLink(doc.id)}
                          disabled={isLoading}
                          className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left transition-colors ${isLinked ? 'bg-sky-900/40 border border-sky-700/50' : 'bg-slate-800 border border-transparent hover:border-slate-600'}`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ${isLinked ? 'bg-sky-500 border-sky-500' : 'border-slate-600'}`}>
                            {isLinked && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{doc.label}</p>
                            <p className="text-xs text-slate-400">
                              {DOC_TYPE_LABEL[doc.document_type] ?? doc.document_type}
                              {member ? ` · ${member.name}` : ''}
                              {doc.expiry_date ? ` · exp ${new Date(doc.expiry_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                            </p>
                          </div>
                          {isLoading && <LoadingSpinner size="sm" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        <div className="mt-2">
          <NotesSection trip={trip} canEdit={isOnline} onSave={saveNotes} />
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-col gap-3 mt-2">
          <Button variant="secondary" className="w-full" onClick={handleWhatsApp}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.529 5.858L0 24l6.337-1.502A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.669-.511-5.198-1.4l-.374-.222-3.762.892.943-3.663-.241-.387A9.952 9.952 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            Share trip via WhatsApp
          </Button>

          {flights.length > 0 && (
            <Button variant="secondary" className="w-full" onClick={() => downloadICS(flights[0], getMember(flights[0].family_member_id)?.name ?? 'Passenger')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add first flight to calendar
            </Button>
          )}

          {isOnline && (
            <Button variant="danger" className="w-full" onClick={handleDeleteTrip} loading={deleting}>
              Delete trip
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
