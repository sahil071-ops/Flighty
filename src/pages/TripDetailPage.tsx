import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import {
  getCachedTrip, getCachedFlights, getCachedHotels, getCachedTripDocuments,
  cacheTrips, cacheFlights, cacheHotels, cacheTripDocuments,
} from '@/lib/db';
import { getMember, FAMILY_MEMBERS } from '@/data/members';
import { Layout } from '@/components/layout/Layout';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { FlightCard } from '@/components/flights/FlightCard';
import { HotelCard } from '@/components/hotels/HotelCard';
import { downloadICS } from '@/lib/icsGenerator';
import { getDurationString, formatLocalTime, getTimezoneAbbr } from '@/lib/timezone';
import type { Trip, Flight, Hotel, TripDocument } from '@/types';

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

// ── Document upload row ────────────────────────────────────────────────────────

function DocumentRow({ doc }: { doc: TripDocument }) {
  const member = doc.family_member_id ? getMember(doc.family_member_id) : null;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-800 last:border-0">
      <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
        {doc.file_type === 'image' ? (
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{doc.label}</p>
        <p className="text-xs text-slate-500">{doc.document_type}{member ? ` · ${member.name}` : ' · All'}</p>
      </div>
      {doc.notes && <p className="text-xs text-slate-500 truncate max-w-[120px]">{doc.notes}</p>}
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
  const [docs, setDocs] = useState<TripDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('Visa');
  const [docLabel, setDocLabel] = useState('');
  const [docMember, setDocMember] = useState<string>('');
  const [docUploading, setDocUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (tripId) load(); }, [tripId, isOnline]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (isOnline) {
        const [tripRes, flightsRes, hotelsRes, docsRes] = await Promise.all([
          supabase.from('trips').select('*').eq('id', tripId!).maybeSingle(),
          supabase.from('flights').select('*').eq('trip_id', tripId!).order('leg_order'),
          supabase.from('hotels').select('*').eq('trip_id', tripId!).order('check_in_date'),
          supabase.from('trip_documents').select('*').eq('trip_id', tripId!).order('created_at'),
        ]);
        setTrip(tripRes.data);
        setFlights((flightsRes.data ?? []).sort((a, b) =>
          a.departure_datetime_utc.localeCompare(b.departure_datetime_utc)
        ));
        setHotels((hotelsRes.data ?? []).sort((a, b) => a.check_in_date.localeCompare(b.check_in_date)));
        setDocs(docsRes.data ?? []);
        // Write to IndexedDB for offline access
        const writes: Promise<void>[] = [];
        if (tripRes.data) writes.push(cacheTrips([tripRes.data]));
        if (flightsRes.data?.length) writes.push(cacheFlights(flightsRes.data));
        if (hotelsRes.data?.length) writes.push(cacheHotels(hotelsRes.data));
        if (docsRes.data?.length) writes.push(cacheTripDocuments(docsRes.data));
        Promise.all(writes).catch(() => { /* non-critical */ });
      } else {
        const [cachedTrip, cachedFlights, cachedHotels, cachedDocs] = await Promise.all([
          getCachedTrip(tripId!),
          getCachedFlights(),
          getCachedHotels(),
          getCachedTripDocuments(),
        ]);
        setTrip(cachedTrip ?? null);
        setFlights(cachedFlights.filter(f => f.trip_id === tripId).sort((a, b) =>
          a.departure_datetime_utc.localeCompare(b.departure_datetime_utc)
        ));
        setHotels(cachedHotels.filter(h => h.trip_id === tripId));
        setDocs(cachedDocs.filter(d => d.trip_id === tripId));
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

  async function uploadDocument() {
    if (!docFile || !docLabel.trim() || !tripId) return;
    setDocUploading(true);
    try {
      const ext = docFile.name.split('.').pop() ?? 'pdf';
      const fileType = docFile.type.startsWith('image/') ? 'image' : 'pdf';
      const docId = crypto.randomUUID();
      const path = `documents/${tripId}/${docId}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(path, docFile, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from('trip_documents').insert({
        trip_id: tripId,
        family_member_id: docMember || null,
        document_type: docType,
        label: docLabel.trim(),
        file_url: path,
        file_type: fileType,
      });
      if (insertErr) throw insertErr;

      // Mirror Visas and Travel Insurance to the member's global Documents section
      if (docMember && (docType === 'Visa' || docType === 'Travel Insurance')) {
        const memberDocType = docType === 'Visa' ? 'visa' : 'travel_insurance';
        await supabase.from('member_documents').insert({
          family_member_id: docMember,
          document_type: memberDocType,
          label: docLabel.trim(),
        });
      }

      setDocFile(null);
      setDocLabel('');
      setDocMember('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document.');
    } finally {
      setDocUploading(false);
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

        {/* ── Documents ── */}
        <div className="flex items-center justify-between mt-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Documents</h2>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700">
          {docs.length > 0 ? (
            <div className="px-4">{docs.map(d => <DocumentRow key={d.id} doc={d} />)}</div>
          ) : (
            <p className="text-sm text-slate-500 px-4 py-3">No documents uploaded yet.</p>
          )}

          {isOnline && (
            <div className="border-t border-slate-700 p-4 flex flex-col gap-3">
              <p className="text-xs font-medium text-slate-400">Upload a document (visa, insurance, etc.)</p>

              <div className="grid grid-cols-2 gap-2">
                <select
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  value={docType} onChange={e => setDocType(e.target.value)}
                >
                  {['Visa', 'Travel Insurance', 'Hotel Voucher', 'Other'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  value={docMember} onChange={e => setDocMember(e.target.value)}
                >
                  <option value="">All members</option>
                  {FAMILY_MEMBERS.filter(m => m.id !== 'admin').map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                placeholder="Label, e.g. 'Sahil UAE Visa'"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 w-full"
                value={docLabel} onChange={e => setDocLabel(e.target.value)}
              />

              <button
                type="button"
                onClick={() => docFileRef.current?.click()}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white border border-dashed border-slate-600 rounded-lg px-3 py-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                {docFile ? docFile.name : 'Choose file (PDF or image)'}
                <input
                  ref={docFileRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => setDocFile(e.target.files?.[0] ?? null)}
                />
              </button>

              <Button
                onClick={uploadDocument}
                loading={docUploading}
                size="sm"
                className="w-full"
                disabled={!docFile || !docLabel.trim()}
              >
                Upload document
              </Button>
            </div>
          )}
        </div>

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
