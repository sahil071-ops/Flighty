import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getMember } from '@/data/members';
import { daysUntilExpiry } from '@/types';
import type { MemberDocument } from '@/types';

export function ExpiryWarningBanner() {
  const navigate = useNavigate();
  const [urgentDoc, setUrgentDoc] = useState<MemberDocument | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from('member_documents')
        .select('*')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', in30)
        .order('expiry_date')
        .limit(1);
      setUrgentDoc((data?.[0] as MemberDocument) ?? null);
    } catch {
      // silent — banner is optional
    }
  }

  if (!urgentDoc) return null;

  const days = daysUntilExpiry(urgentDoc.expiry_date);
  if (days === null) return null;

  const memberName = getMember(urgentDoc.family_member_id)?.name ?? urgentDoc.family_member_id;
  let text: string;
  if (days < 0) text = `${memberName}'s ${urgentDoc.label} has expired`;
  else if (days === 0) text = `${memberName}'s ${urgentDoc.label} expires today`;
  else text = `${memberName}'s ${urgentDoc.label} expires in ${days} day${days !== 1 ? 's' : ''}`;

  return (
    <button
      onClick={() => navigate('/documents')}
      className="w-full dark:bg-red-900/40 bg-red-50 dark:border-red-700/50 border-red-300 border rounded-xl px-4 py-3 flex items-center gap-3 text-left active:scale-[0.99] transition-all"
    >
      <svg className="w-4 h-4 dark:text-red-400 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      <p className="text-sm dark:text-red-300 text-red-700 text-left">{text}</p>
    </button>
  );
}
