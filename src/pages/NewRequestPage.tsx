import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FAMILY_MEMBERS, getMember } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { extractFlightOptionsFromText, extractFlightOptionsFromFile, type ExtractedFlightOption } from '@/lib/claudeApi';
import { convertIfHeic } from '@/lib/documentParser';
import { invalidatePendingCache } from '@/components/layout/BottomNav';
import type { FlightRequestLeg } from '@/types';

type Step = 'setup' | 'input' | 'review';
type InputTab = 'paste' | 'upload' | 'manual';

const inputCls = 'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-full';

function LegEditor({
  leg,
  onChange,
  onRemove,
  showRemove,
}: {
  leg: Partial<FlightRequestLeg>;
  onChange: (l: Partial<FlightRequestLeg>) => void;
  onRemove: () => void;
  showRemove: boolean;
}) {
  return (
    <div className="bg-slate-700/40 rounded-xl p-3 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Flight no. e.g. BA199" value={leg.flight_number ?? ''}
          onChange={e => onChange({ ...leg, flight_number: e.target.value || null })} />
        <input className={inputCls} placeholder="Airline" value={leg.airline ?? ''}
          onChange={e => onChange({ ...leg, airline: e.target.value || null })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="From (e.g. BOM)" value={leg.departure_airport_code ?? ''}
          onChange={e => onChange({ ...leg, departure_airport_code: e.target.value.toUpperCase() })} />
        <input className={inputCls} placeholder="To (e.g. LHR)" value={leg.arrival_airport_code ?? ''}
          onChange={e => onChange({ ...leg, arrival_airport_code: e.target.value.toUpperCase() })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Departs</label>
          <div className="grid grid-cols-2 gap-1 mt-1">
            <input type="date" className={inputCls} value={leg.departure_date ?? ''}
              onChange={e => onChange({ ...leg, departure_date: e.target.value })} />
            <input type="time" className={inputCls} value={leg.departure_time ?? ''}
              onChange={e => onChange({ ...leg, departure_time: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Arrives</label>
          <div className="grid grid-cols-2 gap-1 mt-1">
            <input type="date" className={inputCls} value={leg.arrival_date ?? ''}
              onChange={e => onChange({ ...leg, arrival_date: e.target.value })} />
            <input type="time" className={inputCls} value={leg.arrival_time ?? ''}
              onChange={e => onChange({ ...leg, arrival_time: e.target.value })} />
          </div>
        </div>
      </div>
      {showRemove && (
        <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-300 self-start">
          Remove leg
        </button>
      )}
    </div>
  );
}

function OptionEditor({
  opt,
  index,
  onChange,
  onRemove,
  showRemove,
}: {
  opt: Partial<ExtractedFlightOption & { id?: string }>;
  index: number;
  onChange: (o: Partial<ExtractedFlightOption>) => void;
  onRemove: () => void;
  showRemove: boolean;
}) {
  const legs: Partial<FlightRequestLeg>[] = (opt.legs ?? [{ departure_airport_code: '', arrival_airport_code: '', departure_date: '', departure_time: '', arrival_date: '', arrival_time: '' }]) as Partial<FlightRequestLeg>[];

  function updateLeg(i: number, leg: Partial<FlightRequestLeg>) {
    const next = [...legs];
    next[i] = leg;
    onChange({ ...opt, legs: next as FlightRequestLeg[], stops: Math.max(0, next.length - 1) });
  }

  function addLeg() {
    const next = [...legs, { departure_airport_code: '', arrival_airport_code: '', departure_date: '', departure_time: '', arrival_date: '', arrival_time: '' }];
    onChange({ ...opt, legs: next as FlightRequestLeg[], stops: Math.max(0, next.length - 1) });
  }

  function removeLeg(i: number) {
    const next = legs.filter((_, idx) => idx !== i);
    onChange({ ...opt, legs: next as FlightRequestLeg[], stops: Math.max(0, next.length - 1) });
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-white/[.07] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Option {index + 1}</span>
        {showRemove && (
          <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-300">Remove option</button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Price</label>
          <input className={`${inputCls} mt-1`} placeholder="e.g. ₹42,000" value={opt.price ?? ''}
            onChange={e => onChange({ ...opt, price: e.target.value || null })} />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Cabin class</label>
          <select className={`${inputCls} mt-1`} value={opt.cabin_class ?? ''}
            onChange={e => onChange({ ...opt, cabin_class: e.target.value || null })}>
            <option value="">Select…</option>
            <option>Economy</option>
            <option>Premium Economy</option>
            <option>Business</option>
            <option>First</option>
          </select>
        </div>
      </div>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={opt.baggage_checked_included === true}
            onChange={e => onChange({ ...opt, baggage_checked_included: e.target.checked ? true : null })}
            className="accent-cyan-400" />
          <span className="text-slate-300">Checked bag</span>
        </label>
        {opt.baggage_checked_included && (
          <input type="number" className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white w-16"
            placeholder="kg" value={opt.baggage_checked_kg ?? ''}
            onChange={e => onChange({ ...opt, baggage_checked_kg: e.target.value ? Number(e.target.value) : null })} />
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={opt.baggage_cabin_included === true}
            onChange={e => onChange({ ...opt, baggage_cabin_included: e.target.checked ? true : null })}
            className="accent-cyan-400" />
          <span className="text-slate-300">Cabin bag</span>
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-slate-500 uppercase tracking-wide">Flight legs</label>
        {legs.map((leg, i) => (
          <LegEditor
            key={i}
            leg={leg}
            onChange={updated => updateLeg(i, updated)}
            onRemove={() => removeLeg(i)}
            showRemove={legs.length > 1}
          />
        ))}
        <button onClick={addLeg} className="text-xs text-sky-400 hover:text-sky-300 self-start flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add connecting leg
        </button>
      </div>
      <div>
        <label className="text-[10px] text-slate-500 uppercase tracking-wide">Notes / fare conditions</label>
        <textarea className={`${inputCls} mt-1 resize-none`} rows={2} placeholder="Cancellation policy, fare rules, etc."
          value={opt.notes ?? ''} onChange={e => onChange({ ...opt, notes: e.target.value || null })} />
      </div>
    </div>
  );
}

export function NewRequestPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('setup');
  const [inputTab, setInputTab] = useState<InputTab>('paste');

  // Setup fields
  const [label, setLabel] = useState('');
  const [forMemberId, setForMemberId] = useState('');
  const [context, setContext] = useState('');

  // Input fields
  const [pasteText, setPasteText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Options (review step)
  const [options, setOptions] = useState<Partial<ExtractedFlightOption>[]>([]);

  // Submission
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleExtractFromText() {
    if (!pasteText.trim()) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const extracted = await extractFlightOptionsFromText(pasteText.trim());
      setOptions(extracted);
      setStep('review');
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  }

  async function handleExtractFromFile(file: File) {
    setExtracting(true);
    setExtractError(null);
    try {
      const processed = await convertIfHeic(file);
      const extracted = await extractFlightOptionsFromFile(processed);
      setOptions(extracted);
      setStep('review');
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  }

  function addManualOption() {
    setOptions(prev => [
      ...prev,
      {
        option_number: prev.length + 1,
        price: null, cabin_class: null,
        baggage_checked_included: null, baggage_checked_kg: null, baggage_cabin_included: null,
        notes: null, total_duration_minutes: null, stops: 0,
        legs: [{ departure_airport_code: '', arrival_airport_code: '', departure_date: '', departure_time: '', arrival_date: '', arrival_time: '', flight_number: null, airline: null, airline_iata_code: null, departure_city: null, arrival_city: null, duration_minutes: null, layover_minutes_after: null }],
      },
    ]);
    if (step !== 'review') setStep('review');
  }

  async function handleSubmit() {
    if (!label.trim() || !forMemberId || options.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Create request
      const { data: req, error: reqErr } = await supabase
        .from('flight_requests')
        .insert({
          label: label.trim(),
          trip_context: context.trim() || null,
          for_family_member_id: forMemberId,
          status: 'pending',
          raw_input: pasteText.trim() || null,
        })
        .select()
        .single();
      if (reqErr) throw new Error(reqErr.message);

      // Create options
      const optPayloads = options.map((o, i) => ({
        request_id: req.id,
        option_number: o.option_number ?? i + 1,
        legs: o.legs ?? [],
        total_duration_minutes: o.total_duration_minutes ?? null,
        stops: o.stops ?? 0,
        price: o.price ?? null,
        cabin_class: o.cabin_class ?? null,
        baggage_checked_included: o.baggage_checked_included ?? null,
        baggage_checked_kg: o.baggage_checked_kg ?? null,
        baggage_cabin_included: o.baggage_cabin_included ?? null,
        notes: o.notes ?? null,
      }));

      const { error: optsErr } = await supabase.from('flight_request_options').insert(optPayloads);
      if (optsErr) throw new Error(optsErr.message);

      invalidatePendingCache();
      navigate('/requests', { replace: true });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save request');
    } finally {
      setSaving(false);
    }
  }

  // ── Step: Setup ──────────────────────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <Layout title="New Flight Request" hideNav
        headerRight={
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-3 -mr-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        }
      >
        <div className="px-4 py-4 flex flex-col gap-5 pb-8">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Request label *</label>
            <input className={inputCls} placeholder="e.g. London work trip — April options"
              value={label} onChange={e => setLabel(e.target.value)} autoFocus />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Travelling for *</label>
            <div className="flex flex-wrap gap-2">
              {FAMILY_MEMBERS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setForMemberId(m.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all"
                  style={
                    forMemberId === m.id
                      ? { backgroundColor: m.colour + '22', borderColor: m.colour, color: m.colour }
                      : { borderColor: '#334155', color: '#94a3b8', backgroundColor: 'transparent' }
                  }
                >
                  <Avatar name={m.name} colour={forMemberId === m.id ? m.colour : '#64748b'} size="xs" />
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Context / preferences</label>
            <textarea className={`${inputCls} resize-none`} rows={3}
              placeholder="e.g. Needs to be in London by Monday morning, prefers morning departures, business class if under ₹1.5L"
              value={context} onChange={e => setContext(e.target.value)} />
          </div>

          <Button
            disabled={!label.trim() || !forMemberId}
            onClick={() => setStep('input')}
            size="lg" className="w-full"
          >
            Next — Add Flight Options
          </Button>
        </div>
      </Layout>
    );
  }

  // ── Step: Input ──────────────────────────────────────────────────────────────
  if (step === 'input') {
    return (
      <Layout title="Add Flight Options" hideNav
        headerRight={
          <button onClick={() => setStep('setup')} className="text-slate-400 hover:text-white p-3 -mr-3 text-sm">
            Back
          </button>
        }
      >
        <div className="px-4 py-4 pb-8">
          {/* Tab bar */}
          <div className="flex bg-slate-800 rounded-xl p-1 mb-5">
            {(['paste', 'upload', 'manual'] as InputTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setInputTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  inputTab === tab ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'paste' ? 'Paste Text' : tab === 'upload' ? 'Upload File' : 'Manual Entry'}
              </button>
            ))}
          </div>

          {extractError && (
            <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-sm text-red-300 mb-4">
              {extractError}
            </div>
          )}

          {/* Paste tab */}
          {inputTab === 'paste' && (
            <div className="flex flex-col gap-4">
              <textarea
                className={`${inputCls} resize-none`}
                rows={12}
                placeholder="Paste the travel agency email or flight options text here…"
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
              />
              {extracting ? (
                <div className="flex items-center gap-2 text-sky-400 text-sm py-2">
                  <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  Extracting flight options with AI…
                </div>
              ) : (
                <Button disabled={!pasteText.trim()} onClick={handleExtractFromText} size="lg" className="w-full">
                  Extract Options with AI
                </Button>
              )}
            </div>
          )}

          {/* Upload tab */}
          {inputTab === 'upload' && (
            <div className="flex flex-col gap-4">
              {extracting ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <LoadingSpinner size="lg" />
                  <p className="text-sm text-sky-400">Reading document with AI…</p>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-3 bg-slate-800/50 border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-2xl py-12 cursor-pointer transition-colors">
                  <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-300">Upload screenshot, PDF or image</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, WebP, HEIC accepted</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleExtractFromFile(f); }}
                  />
                </label>
              )}
              {extractError && <p className="text-xs text-red-400">{extractError}</p>}
            </div>
          )}

          {/* Manual tab */}
          {inputTab === 'manual' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-500">
                Add options one by one. Each option needs a price, cabin class, and at least one flight leg.
              </p>
              <Button onClick={addManualOption} variant="secondary" className="w-full">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Option
              </Button>
              {options.length > 0 && (
                <Button onClick={() => setStep('review')} size="lg" className="w-full">
                  Review {options.length} option{options.length !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ── Step: Review ─────────────────────────────────────────────────────────────
  return (
    <Layout title="Review Options" hideNav
      headerRight={
        <button onClick={() => setStep('input')} className="text-slate-400 hover:text-white p-3 -mr-3 text-sm">
          Back
        </button>
      }
    >
      <div className="px-4 py-4 pb-8 flex flex-col gap-4">
        <div className="bg-slate-800 rounded-xl p-3 border border-white/[.07]">
          <p className="text-sm font-semibold text-white">{label}</p>
          {context && <p className="text-xs text-slate-500 mt-0.5">{context}</p>}
          <p className="text-xs text-slate-500 mt-1">
            For {getMember(forMemberId)?.name ?? forMemberId} · {options.length} option{options.length !== 1 ? 's' : ''}
          </p>
        </div>

        {options.map((opt, i) => (
          <OptionEditor
            key={i}
            opt={opt}
            index={i}
            onChange={updated => setOptions(prev => prev.map((o, idx) => idx === i ? updated : o))}
            onRemove={() => setOptions(prev => prev.filter((_, idx) => idx !== i))}
            showRemove={options.length > 1}
          />
        ))}

        <button
          onClick={addManualOption}
          className="flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300 transition-colors self-start"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add another option
        </button>

        {saveError && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-sm text-red-300">
            {saveError}
          </div>
        )}

        <Button
          disabled={options.length === 0}
          onClick={handleSubmit}
          loading={saving}
          size="lg" className="w-full"
        >
          Submit for Approval
        </Button>
      </div>
    </Layout>
  );
}
