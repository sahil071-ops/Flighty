import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp, FAMILY_MEMBERS } from '@/context/AppContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { cacheMemberDocuments } from '@/lib/db';
import { FAMILY_MEMBERS as FM } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/layout/Layout';
import { invalidateExpiryCache } from '@/components/layout/BottomNav';
import {
  extractPassportFromFile,
  extractVisaFromFile,
  extractInsuranceFromFile,
  extractOtherDocFromFile,
} from '@/lib/claudeApi';
import type { DocumentType, MemberDocument } from '@/types';

const DISPLAY_MEMBERS = FM.filter(m => m.id !== 'admin');

type DocTypeOption = { value: DocumentType; label: string; icon: string };
const DOC_TYPES: DocTypeOption[] = [
  { value: 'passport', label: 'Passport', icon: '🛂' },
  { value: 'visa', label: 'Visa', icon: '📋' },
  { value: 'travel_insurance', label: 'Travel Insurance', icon: '🛡️' },
  { value: 'other', label: 'Other', icon: '📄' },
];

type FormState = Partial<Omit<MemberDocument, 'id' | 'created_at' | 'updated_at'>>;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500';

export function AddDocumentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentMember } = useApp();
  const { isOnline } = useOffline();

  // Pre-filled member from state (e.g. coming from MemberDocumentsPage)
  const prefilledMemberId: string | undefined = (location.state as { memberId?: string } | null)?.memberId;

  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    prefilledMemberId ?? currentMember?.id ?? ''
  );
  const [docType, setDocType] = useState<DocumentType | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [step, setStep] = useState<'member' | 'type' | 'form'>(
    prefilledMemberId ? 'type' : 'member'
  );

  if (!isOnline) {
    return (
      <Layout title="Add Document" hideNav>
        <div className="px-4 py-8 text-center">
          <p className="text-slate-400">You're offline. Adding documents requires a connection.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </Layout>
    );
  }

  const f = (k: keyof FormState) => form[k] as string ?? '';
  const set = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v || null }));

  async function handleFileExtract(selectedFile: File) {
    if (!docType) return;
    setFile(selectedFile);
    setExtracting(true);
    setExtractError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let extracted: Record<string, any> = {};
      if (docType === 'passport') {
        extracted = await extractPassportFromFile(selectedFile);
        // Auto-generate label from full_name
        const name = extracted.full_name as string | null;
        const country = extracted.passport_country_of_issue as string | null;
        setForm(prev => ({
          ...prev,
          ...(extracted as FormState),
          expiry_date: (extracted.passport_expiry_date as string) ?? null,
          label: prev.label || (name ? `${name}${country ? ` - ${country} Passport` : ' - Passport'}` : ''),
        }));
      } else if (docType === 'visa') {
        extracted = await extractVisaFromFile(selectedFile);
        const country = extracted.visa_country as string | null;
        setForm(prev => ({
          ...prev,
          ...(extracted as FormState),
          expiry_date: (extracted.visa_expiry_date as string) ?? null,
          label: prev.label || (country ? `${country} Visa` : ''),
        }));
      } else if (docType === 'travel_insurance') {
        extracted = await extractInsuranceFromFile(selectedFile);
        const provider = extracted.insurance_provider as string | null;
        setForm(prev => ({
          ...prev,
          ...(extracted as FormState),
          expiry_date: (extracted.insurance_end_date as string) ?? null,
          label: prev.label || (provider ? `${provider} Insurance` : ''),
        }));
      } else {
        extracted = await extractOtherDocFromFile(selectedFile);
        setForm(prev => ({
          ...prev,
          ...(extracted as FormState),
          label: prev.label || (extracted.label as string) || '',
        }));
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Auto-fill failed — fill in manually.');
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!selectedMemberId || !docType) return;
    const label = form.label?.toString().trim();
    if (!label) { setSaveError('Label is required.'); return; }

    setSaving(true);
    setSaveError(null);

    // Step 1: Primary insert — only this failure shows an error to the user
    let inserted: { id: string } | null = null;
    try {
      const payload: Record<string, unknown> = {
        family_member_id: selectedMemberId,
        document_type: docType,
        ...form,
        label,
      };
      const { data, error } = await supabase
        .from('member_documents')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      inserted = data;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save document.');
      setSaving(false);
      return;
    }

    // Step 2: Secondary operations — failures here are silently logged, save already succeeded
    if (file && inserted) {
      try {
        const ext = file.type === 'application/pdf' ? 'pdf' : (file.type.split('/')[1] || 'jpg');
        const path = `${selectedMemberId}/${inserted.id}.${ext}`;
        console.log('[DocUpload] Uploading file to member-documents bucket:', path, 'size:', file.size, 'type:', file.type);
        const { error: uploadErr } = await supabase.storage
          .from('member-documents')
          .upload(path, file, { contentType: file.type, upsert: true });
        if (uploadErr) {
          console.error('[DocUpload] Storage upload failed:', uploadErr.message, uploadErr);
        } else {
          console.log('[DocUpload] File uploaded successfully, updating file_url on record');
          const { error: updateErr } = await supabase
            .from('member_documents')
            .update({ file_url: path, file_type: ext === 'pdf' ? 'pdf' : 'image' })
            .eq('id', inserted.id);
          if (updateErr) {
            console.error('[DocUpload] Failed to update file_url on document record:', updateErr.message);
          } else {
            console.log('[DocUpload] Document record updated with file_url:', path);
          }
        }
      } catch (err) {
        console.error('[DocUpload] Unexpected error during file upload:', err);
      }
    }

    // Cache the saved document for offline access
    try {
      const { data: saved } = await supabase
        .from('member_documents')
        .select('*')
        .eq('id', inserted!.id)
        .single();
      if (saved) await cacheMemberDocuments([saved]);
    } catch {
      // Non-critical
    }

    invalidateExpiryCache();
    setSaving(false);
    navigate(`/documents/member/${selectedMemberId}`);
  }

  return (
    <Layout
      title="Add Document"
      hideNav
      headerRight={
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-3 -mr-3 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    >
      <div className="px-4 py-4 flex flex-col gap-6">
        {/* Step 1: Select member */}
        {step === 'member' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Who is this document for?</h2>
            <div className="flex flex-col gap-2">
              {DISPLAY_MEMBERS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMemberId(m.id); setStep('type'); }}
                  className="flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-sky-600 active:scale-[0.99] transition-all text-left"
                >
                  <Avatar name={m.name} colour={m.colour} size="md" />
                  <span className="text-sm font-semibold text-white">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select document type */}
        {step === 'type' && (
          <div>
            {selectedMemberId && (
              <div className="flex items-center gap-3 mb-5">
                {(() => {
                  const m = DISPLAY_MEMBERS.find(x => x.id === selectedMemberId);
                  return m ? <><Avatar name={m.name} colour={m.colour} size="sm" /><span className="text-sm text-slate-400">{m.name}</span></> : null;
                })()}
              </div>
            )}
            <h2 className="text-xl font-semibold text-white mb-4">What type of document?</h2>
            <div className="grid grid-cols-2 gap-3">
              {DOC_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => { setDocType(t.value); setStep('form'); }}
                  className="flex flex-col items-center gap-2 bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-sky-600 active:scale-[0.99] transition-all"
                >
                  <span className="text-3xl">{t.icon}</span>
                  <span className="text-sm font-medium text-white">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Upload + form */}
        {step === 'form' && docType && (
          <div className="flex flex-col gap-5">
            {/* Selected context */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              {(() => {
                const m = DISPLAY_MEMBERS.find(x => x.id === selectedMemberId);
                const t = DOC_TYPES.find(x => x.value === docType);
                return <>{m?.name}{m && t ? ' · ' : ''}{t?.label}</>;
              })()}
            </div>

            {/* File upload for auto-fill */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-sm font-medium text-white mb-1">Auto-fill with AI</p>
              <p className="text-xs text-slate-500 mb-3">Upload a photo or scan to extract details automatically</p>
              {file ? (
                <div className="flex items-center justify-between bg-slate-700 rounded-lg px-3 py-2">
                  <span className="text-sm text-slate-300 truncate flex-1">{file.name}</span>
                  <button onClick={() => setFile(null)} className="text-slate-500 hover:text-white ml-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 bg-sky-500/10 border border-sky-700 rounded-lg px-4 py-3 cursor-pointer hover:bg-sky-500/20 transition-colors">
                  <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-sm text-sky-400 font-medium">Upload PDF, JPG or PNG</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleFileExtract(f);
                    }}
                  />
                </label>
              )}
              {extracting && (
                <div className="flex items-center gap-2 mt-3 text-sm text-sky-400">
                  <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  Extracting details with AI...
                </div>
              )}
              {extractError && (
                <p className="text-xs text-amber-400 mt-2">{extractError}</p>
              )}
            </div>

            {/* Label (always required) */}
            <Field label="Label *">
              <input
                type="text"
                className={inputCls}
                placeholder={docType === 'passport' ? 'e.g. Sahil - Indian Passport' : docType === 'visa' ? 'e.g. Sahil - UAE Visa' : 'Document label'}
                value={f('label')}
                onChange={e => set('label', e.target.value)}
              />
            </Field>

            {/* Passport fields */}
            {docType === 'passport' && (
              <>
                <Field label="Passport Number">
                  <input type="text" className={inputCls} placeholder="A1234567" value={f('passport_number')} onChange={e => set('passport_number', e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Country of Issue">
                    <input type="text" className={inputCls} placeholder="India" value={f('passport_country_of_issue')} onChange={e => set('passport_country_of_issue', e.target.value)} />
                  </Field>
                  <Field label="Nationality">
                    <input type="text" className={inputCls} placeholder="Indian" value={f('passport_nationality')} onChange={e => set('passport_nationality', e.target.value)} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date of Birth">
                    <input type="date" className={inputCls} value={f('passport_dob')} onChange={e => set('passport_dob', e.target.value)} />
                  </Field>
                  <Field label="Expiry Date">
                    <input type="date" className={inputCls} value={f('passport_expiry_date')} onChange={e => { set('passport_expiry_date', e.target.value); set('expiry_date', e.target.value); }} />
                  </Field>
                </div>
              </>
            )}

            {/* Visa fields */}
            {docType === 'visa' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Country">
                    <input type="text" className={inputCls} placeholder="UAE" value={f('visa_country')} onChange={e => set('visa_country', e.target.value)} />
                  </Field>
                  <Field label="Issuing Country">
                    <input type="text" className={inputCls} placeholder="UAE" value={f('visa_issuing_country')} onChange={e => set('visa_issuing_country', e.target.value)} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Visa Type">
                    <input type="text" className={inputCls} placeholder="Tourist" value={f('visa_type')} onChange={e => set('visa_type', e.target.value)} />
                  </Field>
                  <Field label="Entry Type">
                    <select className={inputCls} value={f('visa_entry_type')} onChange={e => set('visa_entry_type', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="Single">Single</option>
                      <option value="Multiple">Multiple</option>
                      <option value="Transit">Transit</option>
                    </select>
                  </Field>
                </div>
                <Field label="Duration of Stay">
                  <input type="text" className={inputCls} placeholder="30 days per entry" value={f('visa_duration_of_stay')} onChange={e => set('visa_duration_of_stay', e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Issue Date">
                    <input type="date" className={inputCls} value={f('visa_issue_date')} onChange={e => set('visa_issue_date', e.target.value)} />
                  </Field>
                  <Field label="Expiry Date">
                    <input type="date" className={inputCls} value={f('visa_expiry_date')} onChange={e => { set('visa_expiry_date', e.target.value); set('expiry_date', e.target.value); }} />
                  </Field>
                </div>
              </>
            )}

            {/* Insurance fields */}
            {docType === 'travel_insurance' && (
              <>
                <Field label="Provider">
                  <input type="text" className={inputCls} placeholder="AXA, Allianz..." value={f('insurance_provider')} onChange={e => set('insurance_provider', e.target.value)} />
                </Field>
                <Field label="Policy Number">
                  <input type="text" className={inputCls} placeholder="POL-12345" value={f('insurance_policy_number')} onChange={e => set('insurance_policy_number', e.target.value)} />
                </Field>
                <Field label="Coverage Territory">
                  <input type="text" className={inputCls} placeholder="Worldwide excluding USA" value={f('insurance_coverage')} onChange={e => set('insurance_coverage', e.target.value)} />
                </Field>
                <Field label="Emergency Number">
                  <input type="tel" className={inputCls} placeholder="+44 1234 567890" value={f('insurance_emergency_number')} onChange={e => set('insurance_emergency_number', e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Date">
                    <input type="date" className={inputCls} value={f('insurance_start_date')} onChange={e => set('insurance_start_date', e.target.value)} />
                  </Field>
                  <Field label="End Date">
                    <input type="date" className={inputCls} value={f('insurance_end_date')} onChange={e => { set('insurance_end_date', e.target.value); set('expiry_date', e.target.value); }} />
                  </Field>
                </div>
              </>
            )}

            {/* Other fields */}
            {docType === 'other' && (
              <Field label="Expiry Date (if applicable)">
                <input type="date" className={inputCls} value={f('expiry_date')} onChange={e => set('expiry_date', e.target.value)} />
              </Field>
            )}

            {/* Notes */}
            <Field label="Notes">
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Any additional notes..."
                value={f('notes')}
                onChange={e => set('notes', e.target.value)}
              />
            </Field>

            {saveError && (
              <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-sm text-red-300">
                {saveError}
              </div>
            )}

            <Button variant="primary" className="w-full" onClick={handleSave} loading={saving}>
              Save document
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
