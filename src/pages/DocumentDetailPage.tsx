import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { getCachedMemberDocument, deleteCachedMemberDocument, cacheMemberDocuments } from '@/lib/db';
import { getMember } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { isDocFileCached, openDocFileBlob, cacheDocFile } from '@/lib/docFileCache';
import { invalidateExpiryCache } from '@/components/layout/BottomNav';
import type { MemberDocument } from '@/types';
import { getExpiryStatus, daysUntilExpiry } from '@/types';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-white text-right font-medium">{value}</span>
    </div>
  );
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  const status = getExpiryStatus(expiryDate);
  if (!status || status === 'ok') return null;
  const days = daysUntilExpiry(expiryDate);

  const cls =
    status === 'expired' ? 'bg-red-900/60 text-red-400 border border-red-700' :
    status === 'urgent' ? 'bg-red-900/40 text-red-400 border border-red-700/60' :
    'bg-amber-900/40 text-amber-400 border border-amber-700/60';

  const text =
    days === null ? '' :
    days < 0 ? 'EXPIRED' :
    days === 0 ? 'Expires today' :
    `Expires in ${days} day${days !== 1 ? 's' : ''}`;

  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cls}`}>{text}</span>
  );
}

export function DocumentDetailPage() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { currentMember } = useApp();
  const { isOnline } = useOffline();
  const [doc, setDoc] = useState<MemberDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileCached, setFileCached] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) return;
    loadDoc();
  }, [docId]);

  useEffect(() => {
    if (doc?.file_url) {
      isDocFileCached(doc.file_url).then(setFileCached);
    }
  }, [doc?.file_url]);

  async function loadDoc() {
    setLoading(true);
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('member_documents')
          .select('*')
          .eq('id', docId)
          .maybeSingle();
        if (error) throw error;
        setDoc(data as MemberDocument | null);
        if (data) await cacheMemberDocuments([data as MemberDocument]);
      } else {
        const cached = await getCachedMemberDocument(docId!);
        setDoc(cached ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document.');
    } finally {
      setLoading(false);
    }
  }

  async function handleViewFile() {
    if (!doc?.file_url) return;
    setFileLoading(true);
    try {
      await openDocFileBlob(doc.file_url);
      setFileCached(true);
    } catch {
      setError('Failed to open file. Check your connection.');
    } finally {
      setFileLoading(false);
    }
  }

  async function handleCacheFile() {
    if (!doc?.file_url) return;
    setFileLoading(true);
    try {
      await cacheDocFile(doc.file_url);
      setFileCached(true);
    } catch {
      setError('Failed to save file for offline access.');
    } finally {
      setFileLoading(false);
    }
  }

  async function handleDelete() {
    if (!doc) return;
    if (!confirm('Delete this document? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('member_documents').delete().eq('id', doc.id);
      if (error) throw error;
      if (doc.file_url) {
        await supabase.storage.from('member-documents').remove([doc.file_url]);
      }
      await deleteCachedMemberDocument(doc.id);
      invalidateExpiryCache();
      navigate(`/documents/member/${doc.family_member_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete.');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Layout title="Document" hideNav>
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      </Layout>
    );
  }

  if (!doc) {
    return (
      <Layout title="Not found" hideNav>
        <div className="text-center py-16 px-4">
          <p className="text-slate-400">
            {isOnline
              ? 'Document not found.'
              : "You're offline and this document hasn't been cached yet. Open it while online first."}
          </p>
          <button onClick={() => navigate(-1)} className="text-sky-400 text-sm mt-4">Go back</button>
        </div>
      </Layout>
    );
  }

  const member = getMember(doc.family_member_id);

  const typeLabel = {
    passport: 'Passport',
    visa: 'Visa',
    travel_insurance: 'Travel Insurance',
    other: 'Document',
  }[doc.document_type] ?? 'Document';

  return (
    <Layout
      title={typeLabel}
      hideNav
      headerRight={
        <button
          onClick={() => navigate(`/documents/member/${doc.family_member_id}`)}
          className="text-slate-400 hover:text-white p-3 -mr-3 flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    >
      <div className="px-4 py-4 pb-8 flex flex-col gap-5">
        {/* Member + label header */}
        {member && (
          <div className="flex items-center gap-3">
            <Avatar name={member.name} colour={member.colour} size="md" />
            <div>
              <p className="text-sm font-medium text-white">{member.name}</p>
              <p className="text-xs text-slate-500">{typeLabel}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white flex-1">{doc.label}</h2>
          <ExpiryBadge expiryDate={doc.expiry_date} />
        </div>

        {/* Passport details */}
        {doc.document_type === 'passport' && (
          <div className="bg-slate-800 rounded-xl px-4">
            <Row label="Passport Number" value={doc.passport_number} />
            <Row label="Country of Issue" value={doc.passport_country_of_issue} />
            <Row label="Nationality" value={doc.passport_nationality} />
            <Row label="Date of Birth" value={doc.passport_dob} />
            <Row label="Expiry Date" value={doc.passport_expiry_date} />
          </div>
        )}

        {/* Visa details */}
        {doc.document_type === 'visa' && (
          <div className="bg-slate-800 rounded-xl px-4">
            <Row label="Country" value={doc.visa_country} />
            <Row label="Visa Type" value={doc.visa_type} />
            <Row label="Entry Type" value={doc.visa_entry_type} />
            <Row label="Issuing Country" value={doc.visa_issuing_country} />
            <Row label="Visa Number" value={doc.visa_number} />
            <Row label="Duration of Stay" value={doc.visa_duration_of_stay} />
            <Row label="Issue Date" value={doc.visa_issue_date} />
            <Row label="Expiry Date" value={doc.visa_expiry_date} />
          </div>
        )}

        {/* Insurance details */}
        {doc.document_type === 'travel_insurance' && (
          <div className="bg-slate-800 rounded-xl px-4">
            <Row label="Provider" value={doc.insurance_provider} />
            <Row label="Policy Number" value={doc.insurance_policy_number} />
            <Row label="Coverage" value={doc.insurance_coverage} />
            <Row label="Emergency Number" value={doc.insurance_emergency_number} />
            <Row label="Start Date" value={doc.insurance_start_date} />
            <Row label="End Date" value={doc.insurance_end_date} />
          </div>
        )}

        {/* Other details */}
        {doc.document_type === 'other' && doc.expiry_date && (
          <div className="bg-slate-800 rounded-xl px-4">
            <Row label="Expiry Date" value={doc.expiry_date} />
          </div>
        )}

        {doc.notes && (
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-medium">Notes</p>
            <p className="text-sm text-slate-300">{doc.notes}</p>
          </div>
        )}

        {/* File viewer */}
        {doc.file_url && (
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Attached File</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${
                fileCached
                  ? 'bg-emerald-900/60 text-emerald-400'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {fileCached ? 'Saved offline ✓' : 'Not cached'}
              </span>
            </div>
            <div className="flex gap-3">
              <Button variant="primary" onClick={handleViewFile} loading={fileLoading} className="flex-1">
                View File
              </Button>
              {!fileCached && (
                <Button variant="secondary" onClick={handleCacheFile} loading={fileLoading}>
                  Save offline
                </Button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {!isOnline && (
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-500">You're offline — edit/delete unavailable</p>
          </div>
        )}

        {/* Actions */}
        {isOnline && (
          <Button variant="danger" className="w-full" onClick={handleDelete} loading={deleting}>
            Delete document
          </Button>
        )}
      </div>
    </Layout>
  );
}
