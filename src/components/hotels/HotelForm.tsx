import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { extractHotelFromFile, type ExtractedHotel } from '@/lib/claudeApi';
import type { HotelFormData } from '@/types';
import type { Member } from '@/data/members';

const ACCEPTED_TYPES = 'application/pdf,image/jpeg,image/png,image/webp';

interface HotelFormProps {
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
  initialData?: Partial<HotelFormData>;
  onSubmit: (data: HotelFormData, voucherFile?: File) => Promise<void>;
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

function applyExtracted(extracted: ExtractedHotel, currentUserId: string): HotelFormData {
  return {
    family_member_id: currentUserId,
    hotel_name: extracted.hotel_name ?? '',
    city: extracted.city ?? '',
    country: extracted.country ?? '',
    check_in_date: extracted.check_in_date ?? '',
    check_in_time: extracted.check_in_time ?? '',
    check_out_date: extracted.check_out_date ?? '',
    check_out_time: extracted.check_out_time ?? '',
    confirmation_number: extracted.confirmation_number ?? '',
    booking_reference: extracted.booking_reference ?? '',
    room_type: extracted.room_type ?? '',
    booked_under: extracted.booked_under ?? '',
    address: extracted.address ?? '',
    phone: extracted.phone ?? '',
    price: extracted.price ?? '',
  };
}

export function HotelForm({ members, currentUserId, isAdmin, initialData, onSubmit, submitLabel = 'Save hotel' }: HotelFormProps) {
  const [form, setForm] = useState<HotelFormData>({
    family_member_id: initialData?.family_member_id ?? currentUserId,
    hotel_name: initialData?.hotel_name ?? '',
    city: initialData?.city ?? '',
    country: initialData?.country ?? '',
    check_in_date: initialData?.check_in_date ?? '',
    check_in_time: initialData?.check_in_time ?? '',
    check_out_date: initialData?.check_out_date ?? '',
    check_out_time: initialData?.check_out_time ?? '',
    confirmation_number: initialData?.confirmation_number ?? '',
    booking_reference: initialData?.booking_reference ?? '',
    room_type: initialData?.room_type ?? '',
    booked_under: initialData?.booked_under ?? '',
    address: initialData?.address ?? '',
    phone: initialData?.phone ?? '',
    price: initialData?.price ?? '',
    notes: initialData?.notes ?? '',
  });

  const [voucherFile, setVoucherFile] = useState<File | undefined>();
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set(key: keyof HotelFormData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleVoucherFile(file: File) {
    setVoucherFile(file);
    setExtractError(null);
    setExtracting(true);
    try {
      const extracted = await extractHotelFromFile(file);
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
    if (!form.hotel_name) { setError('Hotel name is required.'); return; }
    if (!form.check_in_date) { setError('Check-in date is required.'); return; }
    if (!form.check_out_date) { setError('Check-out date is required.'); return; }
    setLoading(true);
    try {
      await onSubmit(form, voucherFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hotel.');
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
            <span className="text-sm text-slate-300">Extracting hotel details…</span>
          </div>
        ) : voucherFile ? (
          <p className="text-sm text-emerald-400">✓ {voucherFile.name} — tap to change</p>
        ) : (
          <div>
            <p className="text-sm text-slate-400">Upload booking confirmation (PDF, JPG, PNG or screenshot)</p>
            <p className="text-xs text-sky-400 mt-1">AI will auto-fill the form</p>
          </div>
        )}
      </div>

      {extractError && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-300">
          {extractError} Fill in manually below.
        </div>
      )}

      {isAdmin && (
        <Field label="This hotel is for">
          <select className={inputClass} value={form.family_member_id} onChange={e => set('family_member_id', e.target.value)}>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}{m.id === currentUserId ? ' (you)' : ''}</option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Hotel name *">
        <input type="text" className={inputClass} placeholder="e.g. Taj Dubai" required
          value={form.hotel_name} onChange={e => set('hotel_name', e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          <input type="text" className={inputClass} placeholder="Dubai"
            value={form.city ?? ''} onChange={e => set('city', e.target.value)} />
        </Field>
        <Field label="Country">
          <input type="text" className={inputClass} placeholder="UAE"
            value={form.country ?? ''} onChange={e => set('country', e.target.value)} />
        </Field>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col gap-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Check-in</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date *">
            <input type="date" className={inputClass} required
              value={form.check_in_date} onChange={e => set('check_in_date', e.target.value)} />
          </Field>
          <Field label="Time">
            <input type="time" className={inputClass}
              value={form.check_in_time ?? ''} onChange={e => set('check_in_time', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col gap-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Check-out</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date *">
            <input type="date" className={inputClass} required
              value={form.check_out_date} onChange={e => set('check_out_date', e.target.value)} />
          </Field>
          <Field label="Time">
            <input type="time" className={inputClass}
              value={form.check_out_time ?? ''} onChange={e => set('check_out_time', e.target.value)} />
          </Field>
        </div>
      </div>

      <Field label="Confirmation number">
        <input type="text" className={inputClass} placeholder="HTL-123456"
          value={form.confirmation_number ?? ''} onChange={e => set('confirmation_number', e.target.value)} />
      </Field>

      <Field label="Room type">
        <input type="text" className={inputClass} placeholder="Deluxe King"
          value={form.room_type ?? ''} onChange={e => set('room_type', e.target.value)} />
      </Field>

      <Field label="Booked under (name on reservation)">
        <input type="text" className={inputClass} placeholder="Sahil Sharma"
          value={form.booked_under ?? ''} onChange={e => set('booked_under', e.target.value)} />
      </Field>

      <Field label="Price" hint="Free text, e.g. '12,000 INR/night'">
        <input type="text" className={inputClass} placeholder="12,000 INR/night"
          value={form.price ?? ''} onChange={e => set('price', e.target.value)} />
      </Field>

      <Field label="Address">
        <input type="text" className={inputClass} placeholder="Sheikh Zayed Rd, Dubai"
          value={form.address ?? ''} onChange={e => set('address', e.target.value)} />
      </Field>

      <Field label="Phone">
        <input type="tel" className={inputClass} placeholder="+971 4 000 0000"
          value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} />
      </Field>

      <Field label="Notes">
        <textarea className={`${inputClass} resize-none`} rows={3}
          placeholder="Early check-in requested, loyalty number XYZ…"
          value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
      </Field>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">{submitLabel}</Button>
    </form>
  );
}
