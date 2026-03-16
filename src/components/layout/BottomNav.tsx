import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Module-level cache so we don't re-query on every render
let expiryCache: { val: boolean; ts: number } | null = null;

async function checkExpiringDocs(): Promise<boolean> {
  const now = Date.now();
  if (expiryCache && now - expiryCache.ts < 5 * 60 * 1000) return expiryCache.val;
  try {
    const in30 = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from('member_documents')
      .select('id')
      .not('expiry_date', 'is', null)
      .lte('expiry_date', in30)
      .limit(1);
    const val = (data?.length ?? 0) > 0;
    expiryCache = { val, ts: now };
    return val;
  } catch {
    return false;
  }
}

/** Invalidate the cache so the next render re-queries (call after adding/editing docs). */
export function invalidateExpiryCache() {
  expiryCache = null;
}

export function BottomNav() {
  const { pathname } = useLocation();
  const [hasExpiring, setHasExpiring] = useState(false);

  useEffect(() => {
    checkExpiringDocs().then(setHasExpiring);
  }, []);

  const isHome = pathname === '/';
  const isDocs = pathname.startsWith('/documents');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-t border-white/[.06]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-8">
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center gap-1.5 flex-1 py-2 transition-all duration-200 ${
            isHome ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {isHome && (
            <div className="absolute top-0 w-8 h-px bg-cyan-400/60 rounded-full" />
          )}
          <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isHome ? 2 : 1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className={`text-[10px] font-medium tracking-wide ${isHome ? 'text-cyan-400' : ''}`}>Home</span>
        </Link>

        {/* Documents */}
        <Link
          to="/documents"
          className={`flex flex-col items-center gap-1.5 flex-1 py-2 transition-all duration-200 ${
            isDocs ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="relative">
            <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isDocs ? 2 : 1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
            </svg>
            {hasExpiring && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-900" />
            )}
          </div>
          <span className={`text-[10px] font-medium tracking-wide ${isDocs ? 'text-cyan-400' : ''}`}>Documents</span>
        </Link>
      </div>
    </nav>
  );
}
