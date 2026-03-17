import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { cacheMemberDocuments, getCachedMemberDocuments } from '@/lib/db';
import { FAMILY_MEMBERS } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BottomNav } from '@/components/layout/BottomNav';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import type { MemberDocument } from '@/types';
import { getExpiryStatus, daysUntilExpiry } from '@/types';
import { NotificationSettings } from '@/components/ui/NotificationSettings';

const DISPLAY_MEMBERS = FAMILY_MEMBERS;

function ExpiryAlertCard({ doc }: { doc: MemberDocument }) {
  const navigate = useNavigate();
  const days = daysUntilExpiry(doc.expiry_date);
  const status = getExpiryStatus(doc.expiry_date);
  const member = FAMILY_MEMBERS.find(m => m.id === doc.family_member_id);

  let dayLabel = '';
  if (days === null) return null;
  if (days < 0) dayLabel = 'EXPIRED';
  else if (days === 0) dayLabel = 'Expires today';
  else dayLabel = `Expires in ${days} day${days !== 1 ? 's' : ''}`;

  const isExpired = status === 'expired';

  return (
    <button
      onClick={() => navigate(`/documents/view/${doc.id}`)}
      className="flex items-start gap-3 bg-slate-800 rounded-xl p-4 border border-slate-700 active:scale-[0.99] transition-all w-full text-left"
    >
      <div
        className="w-1.5 rounded-full flex-shrink-0 self-stretch mt-0.5"
        style={{ backgroundColor: member?.colour ?? '#64748b', minHeight: 32 }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium" style={{ color: member?.colour ?? '#94a3b8' }}>
            {member?.name ?? doc.family_member_id}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
            isExpired
              ? 'bg-red-900/60 text-red-400 border border-red-700'
              : 'bg-red-900/40 text-red-400 border border-red-700/60'
          }`}>
            {dayLabel}
          </span>
        </div>
        <p className="text-sm font-semibold text-white truncate">{doc.label}</p>
        {doc.expiry_date && (
          <p className="text-xs text-slate-500 mt-0.5">{doc.expiry_date}</p>
        )}
      </div>
    </button>
  );
}

export function DocumentsPage() {
  const navigate = useNavigate();
  const { currentMember } = useApp();
  const { isOnline } = useOffline();
  const [allDocs, setAllDocs] = useState<MemberDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [isOnline]);

  async function load() {
    setLoading(true);
    try {
      let docs: MemberDocument[];
      if (isOnline) {
        const { data, error } = await supabase.from('member_documents').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        docs = (data ?? []) as MemberDocument[];
        await cacheMemberDocuments(docs);
      } else {
        docs = await getCachedMemberDocuments();
      }
      setAllDocs(docs);
    } catch {
      setAllDocs(await getCachedMemberDocuments());
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const alerts = allDocs
    .filter(d => d.expiry_date && d.expiry_date <= in30)
    .sort((a, b) => (a.expiry_date ?? '').localeCompare(b.expiry_date ?? ''));

  const docsByMember = new Map<string, number>();
  for (const d of allDocs) {
    docsByMember.set(d.family_member_id, (docsByMember.get(d.family_member_id) ?? 0) + 1);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <OfflineBanner />
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
            </svg>
            <h1 className="text-lg font-semibold text-white">Documents</h1>
          </div>
          {isOnline && (
            <button
              onClick={() => navigate('/documents/add')}
              className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white hover:bg-sky-400 transition-colors"
              aria-label="Add document"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-4 flex flex-col gap-5" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            {/* Expiry alerts */}
            {alerts.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wide px-1 mb-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  Expiry Alerts
                </h2>
                <div className="flex flex-col gap-2">
                  {alerts.map(doc => (
                    <ExpiryAlertCard key={doc.id} doc={doc} />
                  ))}
                </div>
              </section>
            )}

            {/* Family member list */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mb-3">
                Family Members
              </h2>
              <div className="flex flex-col gap-2">
                {DISPLAY_MEMBERS.map(member => {
                  const count = docsByMember.get(member.id) ?? 0;
                  const memberAlerts = alerts.filter(d => d.family_member_id === member.id).length;
                  return (
                    <button
                      key={member.id}
                      onClick={() => navigate(`/documents/member/${member.id}`)}
                      className="flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-500 active:scale-[0.99] transition-all text-left"
                    >
                      <Avatar name={member.name} colour={member.colour} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{member.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {count === 0 ? 'No documents' : `${count} document${count !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      {memberAlerts > 0 && (
                        <span className="w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0">
                          {memberAlerts}
                        </span>
                      )}
                      <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Notification settings */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mb-3">
                Notifications
              </h2>
              <NotificationSettings />
            </section>

            {!isOnline && (
              <p className="text-xs text-slate-600 text-center py-2">Showing cached data · Go online to sync</p>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
