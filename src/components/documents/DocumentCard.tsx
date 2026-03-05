import { Link } from 'react-router-dom';
import type { MemberDocument } from '@/types';
import { getExpiryStatus, daysUntilExpiry } from '@/types';

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  const status = getExpiryStatus(expiryDate);
  if (!status || status === 'ok') return null;

  const days = daysUntilExpiry(expiryDate);

  if (status === 'expired') {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 bg-red-900/60 text-red-400 border border-red-700 rounded-full uppercase tracking-wide">
        Expired
      </span>
    );
  }
  if (status === 'urgent') {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 bg-red-900/40 text-red-400 border border-red-700/60 rounded-full">
        {days === 0 ? 'Expires today' : `${days}d left`}
      </span>
    );
  }
  // soon (≤ 90 days)
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 bg-amber-900/40 text-amber-400 border border-amber-700/60 rounded-full">
      {days}d left
    </span>
  );
}

function docTypeLabel(type: string): string {
  switch (type) {
    case 'passport': return 'Passport';
    case 'visa': return 'Visa';
    case 'travel_insurance': return 'Insurance';
    default: return 'Document';
  }
}

function docDetail(doc: MemberDocument): string {
  switch (doc.document_type) {
    case 'passport':
      return [doc.passport_nationality, doc.passport_country_of_issue, doc.passport_expiry_date ? `Exp ${doc.passport_expiry_date}` : null]
        .filter(Boolean).join(' · ');
    case 'visa':
      return [doc.visa_country, doc.visa_entry_type, doc.visa_expiry_date ? `Exp ${doc.visa_expiry_date}` : null]
        .filter(Boolean).join(' · ');
    case 'travel_insurance':
      return [doc.insurance_provider, doc.insurance_coverage, doc.insurance_end_date ? `Until ${doc.insurance_end_date}` : null]
        .filter(Boolean).join(' · ');
    default:
      return doc.expiry_date ? `Expires ${doc.expiry_date}` : '';
  }
}

export function DocumentCard({ doc }: { doc: MemberDocument }) {
  const status = getExpiryStatus(doc.expiry_date);
  const accentColor =
    status === 'expired' || status === 'urgent' ? '#ef4444' :
    status === 'soon' ? '#f59e0b' : '#0ea5e9';

  const detail = docDetail(doc);

  return (
    <Link
      to={`/documents/view/${doc.id}`}
      className="block bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-slate-500 active:scale-[0.99] transition-all"
    >
      <div className="h-0.5" style={{ backgroundColor: accentColor }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {docTypeLabel(doc.document_type)}
              </span>
              <ExpiryBadge expiryDate={doc.expiry_date} />
            </div>
            <p className="text-sm font-semibold text-white truncate">{doc.label}</p>
            {detail && <p className="text-xs text-slate-400 mt-0.5 truncate">{detail}</p>}
          </div>
          {doc.file_url && (
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
              {doc.file_type === 'pdf' ? (
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
