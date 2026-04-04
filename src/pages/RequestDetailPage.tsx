import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getMember } from '@/data/members';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { FlightRequest, FlightRequestOption } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(t: string) {
  // t is HH:MM
  return t.slice(0, 5);
}

function fmtDate(d: string) {
  // d is YYYY-MM-DD
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function fmtDuration(mins: number | null) {
  if (mins == null) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function parsePrice(price: string | null): number | null {
  if (!price) return null;
  const n = parseFloat(price.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

// ── Layover block ──────────────────────────────────────────────────────────────

function LayoverChip({ mins }: { mins: number }) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const label = m === 0 ? `${h}h layover` : `${h}h ${m}m layover`;

  let colour = 'bg-slate-700/60 text-slate-400';
  let extra = '';
  if (mins < 60) {
    colour = 'bg-red-500/15 text-red-400';
    extra = ' · very tight';
  } else if (mins >= 5 * 60) {
    colour = 'bg-amber-500/15 text-amber-400';
    extra = ' · very long wait';
  }

  return (
    <div className={`flex items-center justify-center gap-1.5 py-2 mx-4 rounded-lg text-xs font-medium ${colour}`}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} fill="none" />
      </svg>
      {label}{extra}
    </div>
  );
}

// ── Option card ────────────────────────────────────────────────────────────────

type Badge = 'cheapest' | 'fastest' | 'best';

function OptionCard({
  opt,
  badge,
  selected,
  approved,
  onSelect,
}: {
  opt: FlightRequestOption;
  badge: Badge | null;
  selected: boolean;
  approved: boolean;
  onSelect: () => void;
}) {
  const missingBaggageInfo =
    opt.baggage_checked_included === null || opt.baggage_cabin_included === null;

  const borderClass = approved
    ? 'border-emerald-500/60'
    : selected
    ? 'border-cyan-400/60'
    : 'border-white/[.07]';

  return (
    <button
      onClick={onSelect}
      disabled={approved}
      className={`w-full text-left bg-slate-800 rounded-xl border transition-all ${borderClass} ${
        !approved ? 'hover:border-white/[.14] active:scale-[0.99]' : ''
      } overflow-hidden`}
    >
      {/* Badge row */}
      {badge && (
        <div
          className={`px-4 py-1.5 flex items-center gap-1.5 text-[11px] font-bold ${
            badge === 'best'
              ? 'bg-amber-500/20 text-amber-300'
              : badge === 'cheapest'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-sky-500/15 text-sky-400'
          }`}
        >
          {badge === 'best' && '★ Best option'}
          {badge === 'cheapest' && '↓ Lowest price'}
          {badge === 'fastest' && '⚡ Fastest'}
        </div>
      )}

      <div className="p-4">
        {/* Option header: number + price */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
              Option {opt.option_number}
            </p>
            {opt.price && (
              <p className="text-[22px] font-bold text-white leading-none">{opt.price}</p>
            )}
          </div>
          <div className="text-right">
            {opt.cabin_class && (
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">
                {opt.cabin_class}
              </span>
            )}
            {opt.total_duration_minutes != null && (
              <p className="text-[12px] text-slate-400 mt-1.5">
                {fmtDuration(opt.total_duration_minutes)} ·{' '}
                {opt.stops === 0
                  ? 'Direct'
                  : opt.stops === 1
                  ? '1 stop'
                  : `${opt.stops} stops`}
              </p>
            )}
          </div>
        </div>

        {/* Baggage chips */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <BaggageChip
            label="Checked bag"
            included={opt.baggage_checked_included}
            kg={opt.baggage_checked_kg}
          />
          <BaggageChip
            label="Cabin bag"
            included={opt.baggage_cabin_included}
          />
        </div>

        {/* Missing baggage warning */}
        {missingBaggageInfo && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
            <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-[11px] text-amber-300">Baggage allowance not confirmed — check with airline</p>
          </div>
        )}

        {/* Legs */}
        <div className="space-y-0 rounded-lg overflow-hidden border border-white/[.06]">
          {opt.legs.map((leg, i) => (
            <div key={i}>
              {i > 0 && opt.legs[i - 1].layover_minutes_after != null && (
                <LayoverChip mins={opt.legs[i - 1].layover_minutes_after!} />
              )}
              <LegRow leg={leg} isFirst={i === 0} isLast={i === opt.legs.length - 1} />
            </div>
          ))}
        </div>

        {opt.notes && (
          <p className="text-[11px] text-slate-500 mt-3 italic">{opt.notes}</p>
        )}
      </div>

      {/* Selection indicator */}
      {selected && !approved && (
        <div className="bg-cyan-400/10 px-4 py-2 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-cyan-400 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
          </div>
          <span className="text-[11px] font-semibold text-cyan-400">Selected</span>
        </div>
      )}
      {approved && (
        <div className="bg-emerald-500/10 px-4 py-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-[11px] font-semibold text-emerald-400">Approved</span>
        </div>
      )}
    </button>
  );
}

function BaggageChip({ label, included, kg }: { label: string; included: boolean | null; kg?: number | null }) {
  if (included === null) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium bg-slate-700/60 text-slate-500 px-2 py-0.5 rounded-full border border-white/[.05]">
        <span className="text-slate-600">?</span> {label}
      </span>
    );
  }
  if (!included) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">
        ✗ {label}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
      ✓ {label}{kg ? ` (${kg}kg)` : ''}
    </span>
  );
}

function LegRow({ leg, isFirst, isLast }: {
  leg: FlightRequestOption['legs'][number];
  isFirst: boolean;
  isLast: boolean;
}) {
  const airline = leg.airline ?? leg.airline_iata_code ?? '';
  const fn = leg.flight_number ?? '';

  return (
    <div className={`bg-slate-800/40 px-4 py-3 ${!isLast ? 'border-b border-white/[.05]' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-400">
          {[fn, airline].filter(Boolean).join(' · ')}
        </span>
        {leg.duration_minutes != null && (
          <span className="text-[11px] text-slate-500">{fmtDuration(leg.duration_minutes)}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {/* Departure */}
        <div className="text-center min-w-[48px]">
          <p className="text-[15px] font-bold text-white leading-none">{fmtTime(leg.departure_time)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{leg.departure_airport_code}</p>
          <p className="text-[10px] text-slate-600">{fmtDate(leg.departure_date)}</p>
        </div>
        {/* Arrow */}
        <div className="flex-1 flex items-center gap-1 min-w-0">
          <div className="flex-1 h-px bg-slate-600" />
          <svg className="w-3 h-3 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
          </svg>
          <div className="flex-1 h-px bg-slate-600" />
        </div>
        {/* Arrival */}
        <div className="text-center min-w-[48px]">
          <p className="text-[15px] font-bold text-white leading-none">{fmtTime(leg.arrival_time)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{leg.arrival_airport_code}</p>
          <p className="text-[10px] text-slate-600">{fmtDate(leg.arrival_date)}</p>
        </div>
      </div>
      {(leg.departure_city || leg.arrival_city) && (
        <p className="text-[10px] text-slate-600 mt-1.5 text-center">
          {leg.departure_city ?? leg.departure_airport_code} → {leg.arrival_city ?? leg.arrival_airport_code}
        </p>
      )}
    </div>
  );
}

// ── Travel preferences ─────────────────────────────────────────────────────────

function TravelPrefsBox({ memberId }: { memberId: string }) {
  const prefs = localStorage.getItem(`ff_prefs_${memberId}`);
  if (!prefs) return null;

  return (
    <div className="bg-slate-800 rounded-xl border border-cyan-400/20 px-4 py-3 mb-4">
      <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide mb-1.5">Travel Preferences</p>
      <p className="text-[12px] text-slate-300 whitespace-pre-wrap">{prefs}</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function RequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<FlightRequest | null>(null);
  const [options, setOptions] = useState<FlightRequestOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [requestId]);

  async function load() {
    if (!requestId) return;
    setLoading(true);
    try {
      const [{ data: req }, { data: opts }] = await Promise.all([
        supabase.from('flight_requests').select('*').eq('id', requestId).single(),
        supabase.from('flight_request_options').select('*').eq('request_id', requestId).order('option_number'),
      ]);
      if (req) setRequest(req as FlightRequest);
      if (opts) setOptions(opts as FlightRequestOption[]);
      if (req?.approved_option_id) setSelectedId(req.approved_option_id);
    } finally {
      setLoading(false);
    }
  }

  // Compute badges
  const prices = options.map(o => parsePrice(o.price));
  const durations = options.map(o => o.total_duration_minutes);

  const minPrice = prices.reduce<number | null>((acc, p) => (p != null && (acc == null || p < acc) ? p : acc), null);
  const minDuration = durations.reduce<number | null>((acc, d) => (d != null && (acc == null || d < acc) ? d : acc), null);

  function getBadge(opt: FlightRequestOption): Badge | null {
    const price = parsePrice(opt.price);
    const isCheapest = price != null && price === minPrice;
    const isFastest = opt.total_duration_minutes != null && opt.total_duration_minutes === minDuration;
    if (isCheapest && isFastest) return 'best';
    if (isCheapest) return 'cheapest';
    if (isFastest) return 'fastest';
    return null;
  }

  async function handleApprove() {
    if (!selectedId || !request) return;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('flight_requests')
        .update({
          status: 'approved',
          approved_option_id: selectedId,
          approver_comment: comment.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);
      if (err) throw err;
      setRequest(r => r ? { ...r, status: 'approved', approved_option_id: selectedId, approver_comment: comment.trim() || null } : r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setSaving(false);
    }
  }

  async function handleDecline() {
    if (!request) return;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('flight_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', request.id);
      if (err) throw err;
      navigate('/requests');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to decline');
    } finally {
      setSaving(false);
    }
  }

  const backButton = (
    <button onClick={() => navigate('/requests')} className="text-slate-400 hover:text-white p-2 -ml-2">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </button>
  );

  if (loading) {
    return (
      <Layout title="Request" headerRight={backButton}>
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      </Layout>
    );
  }

  if (!request) {
    return (
      <Layout title="Request" headerRight={backButton}>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <p className="text-slate-400">Request not found</p>
        </div>
      </Layout>
    );
  }

  const member = getMember(request.for_family_member_id);
  const isApproved = request.status === 'approved' || request.status === 'trip_created';
  const isDeclined = request.status === 'declined';
  const isPending = request.status === 'pending';
  const approvedOption = options.find(o => o.id === request.approved_option_id);

  return (
    <Layout
      title={request.label}
      headerRight={backButton}
    >
      <div className="px-4 py-4 pb-48">
        {/* Meta */}
        <div className="flex items-center gap-3 mb-4">
          {member && (
            <span className="flex items-center gap-1.5 text-[12px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: member.colour }} />
              {member.name}
            </span>
          )}
          {request.trip_context && (
            <span className="text-[12px] text-slate-500 flex-1 truncate">{request.trip_context}</span>
          )}
        </div>

        {/* Status banners */}
        {isApproved && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-emerald-400">
                Option {approvedOption?.option_number} approved
              </p>
              {request.approver_comment && (
                <p className="text-[11px] text-emerald-300/70 mt-0.5">{request.approver_comment}</p>
              )}
            </div>
          </div>
        )}

        {isDeclined && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-[13px] font-semibold text-red-400">All options declined</p>
          </div>
        )}

        {/* Travel preferences */}
        <TravelPrefsBox memberId={request.for_family_member_id} />

        {/* Options */}
        {options.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-400 text-sm">No options added yet</p>
            <p className="text-slate-600 text-xs mt-1">The assistant will add flight options here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {options.map(opt => (
              <OptionCard
                key={opt.id}
                opt={opt}
                badge={getBadge(opt)}
                selected={selectedId === opt.id}
                approved={isApproved && request.approved_option_id === opt.id}
                onSelect={() => {
                  if (!isPending) return;
                  setSelectedId(v => v === opt.id ? null : opt.id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {isPending && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/[.08] px-4 pt-3 pb-safe-4"
          style={{ paddingBottom: `max(1rem, env(safe-area-inset-bottom))` }}
        >
          {/* Comment input — shown when option is selected */}
          {selectedId && (
            <div className="mb-3">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a comment (optional)…"
                rows={2}
                className="w-full bg-slate-800 border border-white/[.1] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 resize-none"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 mb-2">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-white/[.1] text-sm font-semibold text-slate-400 hover:text-white hover:border-white/[.2] transition-colors disabled:opacity-40"
            >
              Decline all
            </button>
            <button
              onClick={handleApprove}
              disabled={!selectedId || saving}
              className="flex-[2] py-3 rounded-xl bg-cyan-400 text-black text-sm font-bold hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : selectedId
                ? `Approve Option ${options.find(o => o.id === selectedId)?.option_number ?? ''}`
                : 'Select an option'}
            </button>
          </div>
        </div>
      )}

      {/* Post-approval create trip button */}
      {isApproved && request.status !== 'trip_created' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/[.08] px-4 pt-3"
          style={{ paddingBottom: `max(1rem, env(safe-area-inset-bottom))` }}
        >
          <button
            onClick={() => navigate(`/trips/new-from-request/${request.id}`)}
            className="w-full py-3.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Create Trip from this
          </button>
        </div>
      )}
    </Layout>
  );
}
