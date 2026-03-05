import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { getCachedMemberDocuments } from '@/lib/db';
import { getMember } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BottomNav } from '@/components/layout/BottomNav';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { DocumentCard } from '@/components/documents/DocumentCard';
import type { MemberDocument, DocumentType } from '@/types';

const TYPE_ORDER: DocumentType[] = ['passport', 'visa', 'travel_insurance', 'other'];
const TYPE_LABELS: Record<DocumentType, string> = {
  passport: 'Passports',
  visa: 'Visas',
  travel_insurance: 'Travel Insurance',
  other: 'Other Documents',
};

export function MemberDocumentsPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { currentMember } = useApp();
  const { isOnline } = useOffline();
  const [docs, setDocs] = useState<MemberDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const member = getMember(memberId ?? '');
  useEffect(() => {
    if (!memberId) return;
    load();
  }, [memberId, isOnline]);

  async function load() {
    setLoading(true);
    try {
      let result: MemberDocument[];
      if (isOnline) {
        const { data, error } = await supabase
          .from('member_documents')
          .select('*')
          .eq('family_member_id', memberId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = (data ?? []) as MemberDocument[];
      } else {
        const cached = await getCachedMemberDocuments();
        result = cached.filter(d => d.family_member_id === memberId);
      }
      setDocs(result);
    } catch {
      const cached = await getCachedMemberDocuments();
      setDocs(cached.filter(d => d.family_member_id === memberId));
    } finally {
      setLoading(false);
    }
  }

  const grouped = new Map<DocumentType, MemberDocument[]>();
  for (const doc of docs) {
    const type = doc.document_type as DocumentType;
    const arr = grouped.get(type) ?? [];
    arr.push(doc);
    grouped.set(type, arr);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <OfflineBanner />
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate('/documents')}
            className="text-slate-400 hover:text-white p-2 -ml-2"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          {member && <Avatar name={member.name} colour={member.colour} size="sm" />}
          <span className="text-base font-semibold text-white flex-1">
            {member?.name ?? memberId}
          </span>
          {isOnline && (
            <button
              onClick={() => navigate('/documents/add', { state: { memberId } })}
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

      <main className="flex-1 px-4 py-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🪪</div>
            <h2 className="text-lg font-semibold text-white mb-2">No documents yet</h2>
            {isOnline ? (
              <button
                onClick={() => navigate('/documents/add', { state: { memberId } })}
                className="inline-flex items-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-sky-400 transition-colors mt-4"
              >
                Add document
              </button>
            ) : (
              <p className="text-slate-500 text-sm">No documents have been added yet.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {TYPE_ORDER.filter(t => grouped.has(t)).map(type => (
              <section key={type}>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mb-3">
                  {TYPE_LABELS[type]}
                </h2>
                <div className="flex flex-col gap-2">
                  {(grouped.get(type) ?? []).map(doc => (
                    <DocumentCard key={doc.id} doc={doc} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
