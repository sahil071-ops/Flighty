import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';

// Module-level cache so we don't re-query on every render
let expiryCache: { val: boolean; ts: number } | null = null;
let pendingCache: { val: number; ts: number } | null = null;

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

async function checkPendingRequests(): Promise<number> {
  const now = Date.now();
  if (pendingCache && now - pendingCache.ts < 60 * 1000) return pendingCache.val;
  try {
    const { count } = await supabase
      .from('flight_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    const val = count ?? 0;
    pendingCache = { val, ts: now };
    return val;
  } catch {
    return 0;
  }
}

/** Invalidate the cache so the next render re-queries (call after adding/editing docs). */
export function invalidateExpiryCache() {
  expiryCache = null;
}

export function invalidatePendingCache() {
  pendingCache = null;
}

export function BottomNav() {
  const { pathname } = useLocation();
  const { currentMember } = useApp();
  const [hasExpiring, setHasExpiring] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    checkExpiringDocs().then(setHasExpiring);
  }, []);

  useEffect(() => {
    if (!currentMember?.isApprover) return;
    checkPendingRequests().then(setPendingCount);
  }, [currentMember?.isApprover]);

  const isHome = pathname === '/';
  const isDocs = pathname.startsWith('/documents');
  const isRequests = pathname.startsWith('/requests');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-t border-white/[.06]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-6">
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

        {/* Requests — only shown to the approver */}
        {currentMember?.isApprover && (
          <Link
            to="/requests"
            className={`flex flex-col items-center gap-1.5 flex-1 py-2 transition-all duration-200 ${
              isRequests ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="relative">
              <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isRequests ? 2 : 1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-slate-900">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium tracking-wide ${isRequests ? 'text-cyan-400' : ''}`}>Requests</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
