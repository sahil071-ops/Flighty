import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { getAirportTimezone, localToUTC } from '@/lib/timezone';
import { lookupFlight } from '@/lib/aviationStack';
import type { FlightFormData } from '@/types';
import type { Member } from '@/data/members';
import type { ExtractedFlight } from '@/lib/claudeApi';

interface FlightFormProps {
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
  prefill?: Partial<ExtractedFlight>;
  initialData?: Partial<FlightFormData>;
  onSubmit: (data: FlightFormData, pdfFile?: File) => Promise<void>;
  submitLabel?: string;
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const inputClass =
  'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-full';

export function FlightForm({
  members,
  currentUserId,
  isAdmin,
  prefill,
  initialData,
  onSubmit,
  submitLabel = 'Save flight',
}: FlightFormProps) {
  const [form, setForm] = useState<FlightFormData>({
    family_member_id: initialData?.family_member_id ?? currentUserId,
    trip_name: initialData?.trip_name ?? '',
    flight_number: initialData?.flight_number ?? prefill?.flight_number ?? '',
    airline: initialData?.airline ?? prefill?.airline ?? '',
    departure_airport_code: initialData?.departure_airport_code ?? prefill?.departure_airport_code ?? '',
    departure_airport_name: initialData?.departure_airport_name ?? prefill?.departure_airport_name ?? '',
    departure_city: initialData?.departure_city ?? prefill?.departure_city ?? '',
    departure_date: initialData?.departure_date ?? prefill?.departure_date ?? '',
    departure_time: initialData?.departure_time ?? prefill?.departure_time ?? '',
    arrival_airport_code: initialData?.arrival_airport_code ?? prefill?.arrival_airport_code ?? '',
    arrival_airport_name: initialData?.arrival_airport_name ?? prefill?.arrival_airport_name ?? '',
    arrival_city: initialData?.arrival_city ?? prefill?.arrival_city ?? '',
    arrival_date: initialData?.arrival_date ?? prefill?.arrival_date ?? '',
    arrival_time: initialData?.arrival_time ?? prefill?.arrival_time ?? '',
    terminal_departure: initialData?.terminal_departure ?? prefill?.terminal_departure ?? '',
    terminal_arrival: initialData?.terminal_arrival ?? prefill?.terminal_arrival ?? '',
    gate: initialData?.gate ?? '',
    seat: initialData?.seat ?? prefill?.seat ?? '',
    booking_reference: initialData?.booking_reference ?? prefill?.booking_reference ?? '',
    price: initialData?.price ?? '',
    notes: initialData?.notes ?? '',
  });

  const [pdfFile, setPdfFile] = useState<File | undefined>();
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupDone, setLookupDone] = useState(false);

  function set(key: keyof FlightFormData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  // Auto-fill timezone & airport info when airport code changes
  function handleDepAirportBlur() {
    const code = form.departure_airport_code.toUpperCase().trim();
    if (code.length === 3) {
      set('departure_airport_code', code);
    }
  }

  function handleArrAirportBlur() {
    const code = form.arrival_airport_code.toUpperCase().trim();
    if (code.length === 3) {
      set('arrival_airport_code', code);
    }
  }

  // AviationStack lookup
  const handleLookup = useCallback(async () => {
    if (!form.flight_number || !form.departure_date) return;
    setLookingUp(true);
    try {
      const result = await lookupFlight(form.flight_number, form.departure_date);
      if (result) {
        setForm(f => ({
          ...f,
          airline: result.airline || f.airline,
          departure_airport_code: result.departure_airport_code || f.departure_airport_code,
          departure_airport_name: result.departure_airport_name || f.departure_airport_name,
          departure_city: result.departure_city || f.departure_city,
          arrival_airport_code: result.arrival_airport_code || f.arrival_airport_code,
          arrival_airport_name: result.arrival_airport_name || f.arrival_airport_name,
          arrival_city: result.arrival_city || f.arrival_city,
          departure_date: result.departure_scheduled
            ? result.departure_scheduled.slice(0, 10)
            : f.departure_date,
          departure_time: result.departure_scheduled
            ? result.departure_scheduled.slice(11, 16)
            : f.departure_time,
          arrival_date: result.arrival_scheduled
            ? result.arrival_scheduled.slice(0, 10)
            : f.arrival_date,
          arrival_time: result.arrival_scheduled
            ? result.arrival_scheduled.slice(11, 16)
            : f.arrival_time,
        }));
        setLookupDone(true);
      } else {
        setLookupDone(true); // mark as done even if not found
      }
    } catch {
      // Silent fail — user can fill manually
    } finally {
      setLookingUp(false);
    }
  }, [form.flight_number, form.departure_date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate required fields
    const required: (keyof FlightFormData)[] = [
      'family_member_id', 'flight_number', 'departure_airport_code',
      'departure_date', 'departure_time', 'arrival_airport_code',
      'arrival_date', 'arrival_time',
    ];
    for (const field of required) {
      if (!form[field]) {
        setError(`Please fill in all required fields (${field.replace(/_/g, ' ')} is missing).`);
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit(form, pdfFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as {message?: string})?.message ?? 'Failed to save flight.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-8">
      {/* Member selector (admin only) */}
      {isAdmin && (
        <Field label="This flight is for">
          <select
            className={inputClass}
            value={form.family_member_id}
            onChange={e => set('family_member_id', e.target.value)}
          >
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}{m.id === currentUserId ? ' (you)' : ''}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* Trip name */}
      <Field label="Trip name (optional)" hint="Group multiple flights under one trip, e.g. 'London Summer 2025'">
        <input
          type="text"
          className={inputClass}
          placeholder="e.g. Goa vacation"
          value={form.trip_name ?? ''}
          onChange={e => set('trip_name', e.target.value)}
        />
      </Field>

      {/* Flight number + lookup */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Flight number *">
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. AI101"
              value={form.flight_number}
              onChange={e => set('flight_number', e.target.value.toUpperCase())}
              required
            />
          </Field>
        </div>
        <div className="w-32">
          <Field label="Date *">
            <input
              type="date"
              className={inputClass}
              value={form.departure_date}
              onChange={e => set('departure_date', e.target.value)}
              required
            />
          </Field>
        </div>
      </div>

      {import.meta.env.VITE_AVIATIONSTACK_API_KEY && !lookupDone && (
        <Button
          type="button"
          variant="secondary"
          onClick={handleLookup}
          loading={lookingUp}
          className="w-full"
        >
          {lookingUp ? 'Looking up flight…' : 'Auto-fill from flight number'}
        </Button>
      )}

      {/* Airline */}
      <Field label="Airline">
        <input
          type="text"
          className={inputClass}
          placeholder="e.g. Air India"
          value={form.airline ?? ''}
          onChange={e => set('airline', e.target.value)}
        />
      </Field>

      {/* Departure */}
      <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col gap-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Departure</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Airport code *">
            <input
              type="text"
              className={inputClass}
              placeholder="BOM"
              value={form.departure_airport_code}
              onChange={e => set('departure_airport_code', e.target.value.toUpperCase())}
              onBlur={handleDepAirportBlur}
              maxLength={3}
              required
            />
          </Field>
          <Field label="Terminal">
            <input
              type="text"
              className={inputClass}
              placeholder="T2"
              value={form.terminal_departure ?? ''}
              onChange={e => set('terminal_departure', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Airport name">
          <input
            type="text"
            className={inputClass}
            placeholder="Chhatrapati Shivaji Maharaj International"
            value={form.departure_airport_name ?? ''}
            onChange={e => set('departure_airport_name', e.target.value)}
          />
        </Field>
        <Field label="City">
          <input
            type="text"
            className={inputClass}
            placeholder="Mumbai"
            value={form.departure_city ?? ''}
            onChange={e => set('departure_city', e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date *">
            <input
              type="date"
              className={inputClass}
              value={form.departure_date}
              onChange={e => set('departure_date', e.target.value)}
              required
            />
          </Field>
          <Field label="Local time *">
            <input
              type="time"
              className={inputClass}
              value={form.departure_time}
              onChange={e => set('departure_time', e.target.value)}
              required
            />
          </Field>
        </div>
        {form.departure_airport_code.length === 3 && (
          <p className="text-xs text-slate-500">
            Timezone: {getAirportTimezone(form.departure_airport_code)}
          </p>
        )}
      </div>

      {/* Arrival */}
      <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col gap-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Arrival</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Airport code *">
            <input
              type="text"
              className={inputClass}
              placeholder="DXB"
              value={form.arrival_airport_code}
              onChange={e => set('arrival_airport_code', e.target.value.toUpperCase())}
              onBlur={handleArrAirportBlur}
              maxLength={3}
              required
            />
          </Field>
          <Field label="Terminal">
            <input
              type="text"
              className={inputClass}
              placeholder="3"
              value={form.terminal_arrival ?? ''}
              onChange={e => set('terminal_arrival', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Airport name">
          <input
            type="text"
            className={inputClass}
            placeholder="Dubai International"
            value={form.arrival_airport_name ?? ''}
            onChange={e => set('arrival_airport_name', e.target.value)}
          />
        </Field>
        <Field label="City">
          <input
            type="text"
            className={inputClass}
            placeholder="Dubai"
            value={form.arrival_city ?? ''}
            onChange={e => set('arrival_city', e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date *">
            <input
              type="date"
              className={inputClass}
              value={form.arrival_date}
              onChange={e => set('arrival_date', e.target.value)}
              required
            />
          </Field>
          <Field label="Local time *">
            <input
              type="time"
              className={inputClass}
              value={form.arrival_time}
              onChange={e => set('arrival_time', e.target.value)}
              required
            />
          </Field>
        </div>
        {form.arrival_airport_code.length === 3 && (
          <p className="text-xs text-slate-500">
            Timezone: {getAirportTimezone(form.arrival_airport_code)}
          </p>
        )}
      </div>

      {/* Extra details */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Gate">
          <input
            type="text"
            className={inputClass}
            placeholder="A12"
            value={form.gate ?? ''}
            onChange={e => set('gate', e.target.value)}
          />
        </Field>
        <Field label="Seat">
          <input
            type="text"
            className={inputClass}
            placeholder="23A"
            value={form.seat ?? ''}
            onChange={e => set('seat', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Booking reference">
        <input
          type="text"
          className={inputClass}
          placeholder="ABC123"
          value={form.booking_reference ?? ''}
          onChange={e => set('booking_reference', e.target.value.toUpperCase())}
        />
      </Field>

      <Field label="Price" hint="Free text, e.g. '42,000 INR'">
        <input
          type="text"
          className={inputClass}
          placeholder="42,000 INR"
          value={form.price ?? ''}
          onChange={e => set('price', e.target.value)}
        />
      </Field>

      <Field label="Notes">
        <textarea
          className={`${inputClass} resize-none`}
          rows={3}
          placeholder="Any additional notes…"
          value={form.notes ?? ''}
          onChange={e => set('notes', e.target.value)}
        />
      </Field>

      {/* PDF upload */}
      <Field label="Ticket PDF (optional)">
        <label className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 cursor-pointer hover:border-slate-600">
          <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
          <span className="text-sm text-slate-400 flex-1 truncate">
            {pdfFile ? pdfFile.name : 'Attach ticket PDF'}
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => setPdfFile(e.target.files?.[0])}
          />
        </label>
      </Field>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}

/**
 * Convert FlightFormData to the UTC-based fields needed for Supabase.
 */
export function formDataToFlight(data: FlightFormData) {
  const depTz = getAirportTimezone(data.departure_airport_code);
  const arrTz = getAirportTimezone(data.arrival_airport_code);

  const departure_datetime_utc = localToUTC(data.departure_date, data.departure_time, depTz).toISOString();
  const arrival_datetime_utc = localToUTC(data.arrival_date, data.arrival_time, arrTz).toISOString();

  return {
    family_member_id: data.family_member_id,
    trip_id: data.trip_id || null,
    trip_name: data.trip_name || null,
    flight_number: data.flight_number,
    airline: data.airline || null,
    departure_airport_code: data.departure_airport_code,
    departure_airport_name: data.departure_airport_name || null,
    departure_city: data.departure_city || null,
    departure_datetime_utc,
    departure_timezone: depTz,
    arrival_airport_code: data.arrival_airport_code,
    arrival_airport_name: data.arrival_airport_name || null,
    arrival_city: data.arrival_city || null,
    arrival_datetime_utc,
    arrival_timezone: arrTz,
    terminal_departure: data.terminal_departure || null,
    terminal_arrival: data.terminal_arrival || null,
    gate: data.gate || null,
    seat: data.seat || null,
    booking_reference: data.booking_reference || null,
    price: data.price || null,
    notes: data.notes || null,
  };
}
