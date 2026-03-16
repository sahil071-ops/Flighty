/**
 * Surfaced on FlightDetailPage — shows loyalty cards matching
 * the flight's member by IATA code or alliance.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCachedLoyaltyCardsForMember } from '@/lib/db';
import { useOffline } from '@/context/OfflineContext';
import type { LoyaltyCard, Flight } from '@/types';

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

function maskNumber(n: string): string {
  if (n.length <= 4) return n;
  return '••••' + n.slice(-4);
}

interface Props {
  flight: Flight;
}

export function LoyaltyCardSection({ flight }: Props) {
  const { isOnline } = useOffline();
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, [flight.family_member_id]);

  async function loadCards() {
    try {
      let allCards: LoyaltyCard[];
      if (isOnline) {
        const { data } = await supabase
          .from('loyalty_cards')
          .select('*')
          .eq('family_member_id', flight.family_member_id);
        allCards = (data ?? []) as LoyaltyCard[];
      } else {
        allCards = await getCachedLoyaltyCardsForMember(flight.family_member_id);
      }

      // Filter to relevant cards
      const flightIata = flight.flight_number.slice(0, 2).toUpperCase();
      const flightAlliance = AIRLINE_ALLIANCES[flightIata];

      const relevant = allCards.filter(c => {
        const cardIata = c.airline_iata_code?.toUpperCase();
        if (cardIata && cardIata === flightIata) return true;
        if (flightAlliance && c.alliance === flightAlliance) return true;
        return false;
      });

      setCards(relevant);
    } catch {
      const cached = await getCachedLoyaltyCardsForMember(flight.family_member_id);
      setCards(cached);
    }
  }

  async function copyNumber(card: LoyaltyCard) {
    await navigator.clipboard.writeText(card.member_number);
    setCopied(card.id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (cards.length === 0) return null;

  return (
    <div className="bg-slate-800 rounded-xl p-4 mb-5">
      <h3 className="text-sm font-semibold text-white mb-3">Loyalty Cards</h3>
      <div className="flex flex-col gap-2">
        {cards.map(card => (
          <div key={card.id} className="bg-slate-700 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-white truncate">{card.programme_name}</span>
                  {card.tier && (
                    <span className="text-[10px] font-bold bg-amber-900/60 text-amber-400 px-1.5 py-0.5 rounded uppercase">
                      {card.tier}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{card.airline_name}</p>
                {card.alliance && (
                  <p className="text-[10px] text-slate-600 mt-0.5">{card.alliance}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-mono text-slate-300">{maskNumber(card.member_number)}</span>
                  <button
                    onClick={() => copyNumber(card)}
                    className="text-slate-500 hover:text-sky-400 transition-colors"
                    title="Copy member number"
                  >
                    {copied === card.id ? (
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
