import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { extractCarRentalFromFile, type ExtractedCarRental } from '@/lib/claudeApi';
import type { CarRentalFormData } from '@/types';
import type { Member } from '@/data/members';

const ACCEPTED_TYPES = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

interface CarRentalFormProps {
  members: Member[];
  currentUserId: string;
  initialData?: Partial<CarRentalFormData>;
  onSubmit: (data: CarRentalFormData, voucherFile?: File) => Promise<void>;
  submitLabel?: string;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
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

function applyExtracted(extracted: ExtractedCarRental, currentUserId: string): CarRentalFormData {
  return {
    family_member_id: currentUserId,
    company: extracted.company ?? '',
    car_type: extracted.car_type ?? '',
    pickup_location: extracted.pickup_location ?? '',
    dropoff_location: extracted.dropoff_location ?? '',
    pickup_date: extracted.pickup_date ?? '',
    pickup_time: extracted.pickup_time ?? '',
    dropoff_date: extracted.dropoff_date ?? '',
    dropoff_time: extracted.dropoff_time ?? '',
    confirmation_number: extracted.confirmation_number ?? '',
    booking_reference: extracted.booking_reference ?? '',
    driver_name: extracted.driver_name ?? '',
    price: extracted.price ?? '',
  };
}

export function CarRentalForm({
  members, currentUserId, initialData, onSubmit, submitLabel = 'Save car rental',
}: CarRentalFormProps) {
  const [form, setForm] = useState<CarRentalFormData>({
    family_member_id: initialData?.family_member_id ?? currentUserId,
    company: initialData?.company ?? '',
    car_type: initialData?.car_type ?? '',
    pickup_location: initialData?.pickup_location ?? '',
    dropoff_location: initialData?.dropoff_location ?? '',
    pickup_date: initialData?.pickup_date ?? '',
    pickup_time: initialData?.pickup_time ?? '',
    dropoff_date: initialData?.dropoff_date ?? '',
    dropoff_time: initialData?.dropoff_time ?? '',
    confirmation_number: initialData?.confirmation_number ?? '',
    booking_reference: initialData?.booking_reference ?? '',
    driver_name: initialData?.driver_name ?? '',
    price: initialData?.price ?? '',
    notes: initialData?.notes ?? '',
  });

  const [voucherFile, setVoucherFile] = useState<File | undefined>();
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set(key: keyof CarRentalFormData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleVoucherFile(file: File) {
    setVoucherFile(file);
    setExtractError(null);
    setExtracting(true);
    try {
      const extracted = await extractCarRentalFromFile(file);
      setForm(applyExtracted(extracted, form.family_member_id));
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Could not extract details — fill in manually.');
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.company) { setError('Rental company is required.'); return; }
    if (!form.pickup_location) { setError('Pick-up location is required.'); return; }
    if (!form.pickup_date) { setError('Pick-up date is required.'); return; }
    if (!form.dropoff_date) { setError('Drop-off date is required.'); return; }
    setLoading(true);
    try {
      await onSubmit(form, voucherFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save car rental.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-8">
      {/* Voucher upload for auto-fill */}
      <div
        className="border-2 border-dashed border-slate-600 hover:border-sky-600 rounded-xl p-5 text-center cursor-pointer transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept={ACCEPTED_TYPES} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleVoucherFile(f); }} />
        {extracting ? (
          <div className="flex items-center justify-center gap-3">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-slate-300">Extracting rental details…</span>
          </div>
        ) : voucherFile ? (
          <p className="text-sm text-emerald-400">✓ {voucherFile.name} — tap to change</p>
        ) : (
          <div>
            <p className="text-sm text-slate-400">Upload booking confirmation (PDF, JPG, PNG or HEIC)</p>
            <p className="text-xs text-sky-400 mt-1">AI will auto-fill the form</p>
          </div>
        )}
      </div>

      {extractError && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-300">
          {extractError} Fill in manually below.
        </div>
      )}

      <Field label="This rental is for">
        <select className={inputClass} value={form.family_member_id} onChange={e => set('family_member_id', e.target.value)}>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name}{m.id === currentUserId ? ' (you)' : ''}</option>
          ))}
        </select>
      </Field>

      <Field label="Rental company *">
        <input type="text" className={inputClass} placeholder="e.g. Hertz, Avis, Enterprise"
          value={form.company} onChange={e => set('company', e.target.value)} required />
      </Field>

      <Field label="Car type">
        <input type="text" className={inputClass} placeholder="e.g. Economy, SUV, Compact"
          value={form.car_type ?? ''} onChange={e => set('car_type', e.target.value)} />
      </Field>

      <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col gap-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Pick-up</h3>
        <Field label="Location *">
          <input type="text" className={inputClass} placeholder="e.g. Dubai Airport Terminal 1"
            value={form.pickup_location} onChange={e => set('pickup_location', e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date *">
            <input type="date" className={inputClass}
              value={form.pickup_date} onChange={e => set('pickup_date', e.target.value)} required />
          </Field>
          <Field label="Time">
            <input type="time" className={inputClass}
              value={form.pickup_time ?? ''} onChange={e => set('pickup_time', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col gap-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Drop-off</h3>
        <Field label="Location" hint="Leave blank if same as pick-up">
          <input type="text" className={inputClass} placeholder="Same as pick-up location"
            value={form.dropoff_location ?? ''} onChange={e => set('dropoff_location', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date *">
            <input type="date" className={inputClass}
              value={form.dropoff_date} onChange={e => set('dropoff_date', e.target.value)} required />
          </Field>
          <Field label="Time">
            <input type="time" className={inputClass}
              value={form.dropoff_time ?? ''} onChange={e => set('dropoff_time', e.target.value)} />
          </Field>
        </div>
      </div>

      <Field label="Confirmation number">
        <input type="text" className={inputClass} placeholder="RES-123456"
          value={form.confirmation_number ?? ''} onChange={e => set('confirmation_number', e.target.value)} />
      </Field>

      <Field label="Booking reference">
        <input type="text" className={inputClass} placeholder="ABC123"
          value={form.booking_reference ?? ''} onChange={e => set('booking_reference', e.target.value)} />
      </Field>

      <Field label="Main driver name">
        <input type="text" className={inputClass} placeholder="Sahil Sharma"
          value={form.driver_name ?? ''} onChange={e => set('driver_name', e.target.value)} />
      </Field>

      <Field label="Price" hint="Free text, e.g. '€240 total'">
        <input type="text" className={inputClass} placeholder="€240 total"
          value={form.price ?? ''} onChange={e => set('price', e.target.value)} />
      </Field>

      <Field label="Notes">
        <textarea className={`${inputClass} resize-none`} rows={3}
          placeholder="Additional driver, insurance excess, special requests…"
          value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
      </Field>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">{submitLabel}</Button>
    </form>
  );
}
