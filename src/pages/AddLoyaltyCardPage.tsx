import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { cacheLoyaltyCards } from '@/lib/db';
import { FAMILY_MEMBERS } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/layout/Layout';

const AIRLINE_ALLIANCES: Record<string, string> = {
  'BA':'oneworld','AA':'oneworld','QR':'oneworld','CX':'oneworld',
  'MH':'oneworld','IB':'oneworld','AY':'oneworld','JL':'oneworld',
  'LA':'oneworld','RJ':'oneworld','UL':'oneworld',
  'LH':'Star Alliance','UA':'Star Alliance','SQ':'Star Alliance',
  'TK':'Star Alliance','AC':'Star Alliance','NZ':'Star Alliance',
  'OS':'Star Alliance','LO':'Star Alliance','SK':'Star Alliance',
  'NH':'Star Alliance','TP':'Star Alliance','MS':'Star Alliance',
  'BR':'Star Alliance','TG':'Star Alliance','ET':'Star Alliance',
  'DL':'SkyTeam','AF':'SkyTeam','KL':'SkyTeam','MU':'SkyTeam',
  'KE':'SkyTeam','VN':'SkyTeam','AM':'SkyTeam','AZ':'SkyTeam',
};

const inputCls = 'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export function AddLoyaltyCardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledMemberId: string | undefined = (location.state as { memberId?: string } | null)?.memberId;

  const [memberId, setMemberId] = useState(prefilledMemberId ?? '');
  const [step, setStep] = useState<'member' | 'form'>(prefilledMemberId ? 'form' : 'member');
  const [form, setForm] = useState({
    airline_name: '',
    airline_iata_code: '',
    programme_name: '',
    member_number: '',
    tier: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleIataChange(iata: string) {
    const upper = iata.toUpperCase();
    const alliance = AIRLINE_ALLIANCES[upper] ?? '';
    setForm(prev => ({ ...prev, airline_iata_code: upper, alliance }));
  }

  function set(k: keyof typeof form, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!memberId || !form.airline_name || !form.programme_name || !form.member_number) {
      setError('Airline, programme name, and member number are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const alliance = AIRLINE_ALLIANCES[form.airline_iata_code.toUpperCase()] ?? null;
      const payload = {
        family_member_id: memberId,
        airline_name: form.airline_name,
        airline_iata_code: form.airline_iata_code || null,
        programme_name: form.programme_name,
        member_number: form.member_number,
        tier: form.tier || null,
        alliance,
        notes: form.notes || null,
      };
      const { data, error: err } = await supabase.from('loyalty_cards').insert(payload).select().single();
      if (err) throw err;
      if (data) await cacheLoyaltyCards([data]);
      navigate(`/loyalty-cards/${memberId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <Layout
      title="Add Loyalty Card"
      hideNav
      headerRight={
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-3 -mr-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    >
      <div className="px-4 py-4 flex flex-col gap-5">
        {step === 'member' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Whose loyalty card?</h2>
            <div className="flex flex-col gap-2">
              {FAMILY_MEMBERS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setMemberId(m.id); setStep('form'); }}
                  className="flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-sky-600 active:scale-[0.99] transition-all text-left"
                >
                  <Avatar name={m.name} colour={m.colour} size="md" />
                  <span className="text-sm font-semibold text-white">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'form' && (
          <>
            <Field label="Airline name *">
              <input
                type="text"
                className={inputCls}
                placeholder="British Airways"
                value={form.airline_name}
                onChange={e => set('airline_name', e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="IATA code">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="BA"
                  maxLength={2}
                  value={form.airline_iata_code}
                  onChange={e => handleIataChange(e.target.value)}
                />
              </Field>
              <Field label="Alliance (auto)">
                <input
                  type="text"
                  className={`${inputCls} text-slate-400`}
                  readOnly
                  value={AIRLINE_ALLIANCES[form.airline_iata_code.toUpperCase()] ?? '–'}
                />
              </Field>
            </div>

            <Field label="Programme name *">
              <input
                type="text"
                className={inputCls}
                placeholder="Executive Club"
                value={form.programme_name}
                onChange={e => set('programme_name', e.target.value)}
              />
            </Field>

            <Field label="Member number *">
              <input
                type="text"
                className={inputCls}
                placeholder="123456789"
                value={form.member_number}
                onChange={e => set('member_number', e.target.value)}
              />
            </Field>

            <Field label="Tier">
              <input
                type="text"
                className={inputCls}
                placeholder="Gold, Silver, Blue…"
                value={form.tier}
                onChange={e => set('tier', e.target.value)}
              />
            </Field>

            <Field label="Notes">
              <textarea
                className={`${inputCls} resize-none`}
                rows={2}
                placeholder="Any notes…"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </Field>

            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <Button variant="primary" className="w-full" onClick={handleSave} loading={saving}>
              Save loyalty card
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}
