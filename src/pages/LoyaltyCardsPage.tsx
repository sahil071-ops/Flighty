import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { cacheLoyaltyCards, deleteCachedLoyaltyCard } from '@/lib/db';
import { getMember } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BottomNav } from '@/components/layout/BottomNav';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useOffline } from '@/context/OfflineContext';
import type { LoyaltyCard } from '@/types';

function maskNumber(n: string): string {
  if (n.length <= 4) return n;
  return '••••' + n.slice(-4);
}

export function LoyaltyCardsPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { isOnline } = useOffline();
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const member = getMember(memberId ?? '');

  useEffect(() => {
    if (memberId) load();
  }, [memberId]);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loyalty_cards')
        .select('*')
        .eq('family_member_id', memberId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const result = (data ?? []) as LoyaltyCard[];
      setCards(result);
      if (result.length) await cacheLoyaltyCards(result);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(card: LoyaltyCard) {
    if (!confirm(`Delete ${card.airline_name} loyalty card?`)) return;
    try {
      await supabase.from('loyalty_cards').delete().eq('id', card.id);
      await deleteCachedLoyaltyCard(card.id);
      setCards(prev => prev.filter(c => c.id !== card.id));
    } catch {
      // silent
    }
  }

  async function copyNumber(card: LoyaltyCard) {
    await navigator.clipboard.writeText(card.member_number);
    setCopied(card.id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <OfflineBanner />
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-3 -ml-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          {member && <Avatar name={member.name} colour={member.colour} size="sm" />}
          <span className="text-base font-semibold text-white flex-1">
            {member?.name ?? memberId} — Loyalty Cards
          </span>
          {isOnline && (
            <button
              onClick={() => navigate('/loyalty-cards/add', { state: { memberId } })}
              className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white hover:bg-sky-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-4" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : cards.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎫</div>
            <h2 className="text-lg font-semibold text-white mb-2">No loyalty cards</h2>
            {isOnline && (
              <button
                onClick={() => navigate('/loyalty-cards/add', { state: { memberId } })}
                className="inline-flex items-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-sky-400 transition-colors mt-4"
              >
                Add loyalty card
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map(card => (
              <div key={card.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white">{card.programme_name}</span>
                      {card.tier && (
                        <span className="text-[10px] font-bold bg-amber-900/60 text-amber-400 px-1.5 py-0.5 rounded uppercase">
                          {card.tier}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{card.airline_name}</p>
                    {card.alliance && (
                      <p className="text-[10px] text-slate-600">{card.alliance}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(card)}
                    className="text-slate-600 hover:text-red-400 transition-colors text-xs"
                  >
                    Delete
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3 bg-slate-700 rounded-lg px-3 py-2">
                  <span className="text-sm font-mono text-white">{card.member_number}</span>
                  <button
                    onClick={() => copyNumber(card)}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    {copied === card.id ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {card.notes && <p className="text-xs text-slate-500 mt-2">{card.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
