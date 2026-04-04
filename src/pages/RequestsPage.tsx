import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getMember } from '@/data/members';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { FlightRequest } from '@/types';

const STATUS_LABEL: Record<FlightRequest['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
  trip_created: 'Trip Created',
};

const STATUS_COLOUR: Record<FlightRequest['status'], string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  declined: 'bg-red-500/15 text-red-400 border-red-500/30',
  trip_created: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function RequestCard({ req, onClick }: { req: FlightRequest & { optionCount?: number }; onClick: () => void }) {
  const member = getMember(req.for_family_member_id);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-800 rounded-xl p-4 border border-white/[.07] hover:border-white/[.14] active:scale-[0.99] transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-white truncate">{req.label}</p>
          {req.trip_context && (
            <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-1">{req.trip_context}</p>
          )}
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_COLOUR[req.status]}`}>
          {STATUS_LABEL[req.status]}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[12px] text-slate-500">
        {member && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: member.colour }} />
            {member.name}
          </span>
        )}
        {req.optionCount !== undefined && (
          <span>{req.optionCount} option{req.optionCount !== 1 ? 's' : ''}</span>
        )}
        <span className="ml-auto">{fmtDate(req.created_at)}</span>
      </div>
    </button>
  );
}

export function RequestsPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<(FlightRequest & { optionCount?: number })[]>([]);
  const [recent, setRecent] = useState<(FlightRequest & { optionCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecent, setShowRecent] = useState(false);
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      // Load all requests
      const { data: requests } = await supabase
        .from('flight_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!requests) { setLoading(false); return; }

      // Load option counts
      const { data: opts } = await supabase
        .from('flight_request_options')
        .select('request_id');

      const countMap: Record<string, number> = {};
      (opts ?? []).forEach(o => { countMap[o.request_id] = (countMap[o.request_id] ?? 0) + 1; });

      const enriched = requests.map(r => ({ ...r, optionCount: countMap[r.id] ?? 0 })) as (FlightRequest & { optionCount: number })[];

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      setPending(enriched.filter(r => r.status === 'pending'));
      setRecent(enriched.filter(r => r.status !== 'pending' && r.created_at >= thirtyDaysAgo));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout
      title="Requests"
      headerRight={
        isDesktop ? (
          <button
            onClick={() => navigate('/requests/new')}
            className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors pr-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Request
          </button>
        ) : undefined
      }
    >
      <div className="px-4 py-4 pb-8">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            {/* New Request button on desktop at top of content too */}
            {isDesktop && (
              <button
                onClick={() => navigate('/requests/new')}
                className="w-full flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-black font-semibold rounded-xl py-3 mb-5 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Flight Request
              </button>
            )}

            {/* Pending */}
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Pending{pending.length > 0 ? ` · ${pending.length}` : ''}
            </h2>

            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm font-medium">No pending requests</p>
                <p className="text-slate-600 text-xs mt-1">Your travel assistant will add options here</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-6">
                {pending.map(r => (
                  <RequestCard key={r.id} req={r} onClick={() => navigate(`/requests/${r.id}`)} />
                ))}
              </div>
            )}

            {/* Recent */}
            {recent.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowRecent(v => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 w-full"
                >
                  <span>Recent · {recent.length}</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${showRecent ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {showRecent && (
                  <div className="flex flex-col gap-3">
                    {recent.map(r => (
                      <RequestCard key={r.id} req={r} onClick={() => navigate(`/requests/${r.id}`)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
