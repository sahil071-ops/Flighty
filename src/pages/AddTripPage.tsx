import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { FAMILY_MEMBERS } from '@/data/members';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

const inputClass =
  'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-full';

export function AddTripPage() {
  const navigate = useNavigate();
  const { currentMember } = useApp();
  const { isOnline } = useOffline();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    currentMember && currentMember.id !== 'admin' ? [currentMember.id] : []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOnline) {
    return (
      <Layout title="New trip" hideNav>
        <div className="px-4 py-8 text-center">
          <p className="text-slate-400">You're offline. Creating trips requires a connection.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </Layout>
    );
  }

  function toggleMember(id: string) {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Trip name is required.'); return; }
    if (!startDate) { setError('Start date is required.'); return; }
    if (selectedMemberIds.length === 0) { setError('Select at least one traveller.'); return; }

    setLoading(true);
    try {
      const { data, error: insertError } = await supabase
        .from('trips')
        .insert({
          name: name.trim(),
          start_date: startDate,
          end_date: endDate || null,
          family_member_ids: selectedMemberIds,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);
      navigate(`/trips/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip.');
    } finally {
      setLoading(false);
    }
  }

  const displayMembers = FAMILY_MEMBERS.filter(m => m.id !== 'admin');

  return (
    <Layout
      title="New trip"
      hideNav
      headerRight={
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-3 -mr-3 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="px-4 py-4 flex flex-col gap-5 pb-8">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Trip name *</label>
          <input type="text" className={inputClass} placeholder="e.g. Dubai Work Trip — March 2026"
            value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Start date *</label>
            <input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">End date</label>
            <input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">Who's travelling? *</label>
          <div className="flex flex-wrap gap-2">
            {displayMembers.map(m => {
              const active = selectedMemberIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all"
                  style={
                    active
                      ? { backgroundColor: m.colour + '22', borderColor: m.colour, color: m.colour }
                      : { borderColor: '#334155', color: '#94a3b8', backgroundColor: 'transparent' }
                  }
                >
                  <Avatar name={m.name} colour={active ? m.colour : '#64748b'} size="xs" />
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">Create trip</Button>
      </form>
    </Layout>
  );
}
