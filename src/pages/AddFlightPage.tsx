import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { PDFUpload } from '@/components/flights/PDFUpload';
import { FlightForm, formDataToFlight } from '@/components/flights/FlightForm';
import type { Profile, FlightFormData } from '@/types';
import type { ExtractedFlight } from '@/lib/claudeApi';

type Step = 'choice' | 'pdf' | 'form';

export function AddFlightPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isOnline } = useOffline();
  const [step, setStep] = useState<Step>('choice');
  const [members, setMembers] = useState<Profile[]>([]);
  const [extractedFlights, setExtractedFlights] = useState<ExtractedFlight[]>([]);
  const [currentLegIndex, setCurrentLegIndex] = useState(0);

  useEffect(() => {
    if (!profile?.group_id) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('group_id', profile.group_id)
      .then(({ data }) => setMembers(data ?? []));
  }, [profile?.group_id]);

  if (!isOnline) {
    return (
      <Layout title="Add flight">
        <div className="px-4 py-8 text-center">
          <p className="text-slate-400">You're offline. Adding flights requires a connection.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </Layout>
    );
  }

  async function handleFormSubmit(data: FlightFormData, pdfFile?: File) {
    if (!profile?.group_id) throw new Error('Not in a group');

    const flightData = formDataToFlight(data);

    const { data: inserted, error } = await supabase
      .from('flights')
      .insert({
        ...flightData,
        group_id: profile.group_id,
      })
      .select()
      .single();

    if (error) throw error;

    // Upload PDF if provided
    if (pdfFile && inserted) {
      const path = `${profile.group_id}/${inserted.id}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('tickets')
        .upload(path, pdfFile, { contentType: 'application/pdf', upsert: true });

      if (!uploadError) {
        // Store the storage path (not a public URL) — bucket is private.
        // pdfCache.ts downloads via the authenticated Supabase client.
        await supabase
          .from('flights')
          .update({ ticket_pdf_url: path })
          .eq('id', inserted.id);
      }
    }

    // Handle multi-leg
    if (extractedFlights.length > 1 && currentLegIndex < extractedFlights.length - 1) {
      setCurrentLegIndex(i => i + 1);
    } else {
      navigate('/');
    }
  }

  function handleExtracted(flights: ExtractedFlight[]) {
    setExtractedFlights(flights);
    setStep('form');
    setCurrentLegIndex(0);
  }

  const currentPrefill =
    extractedFlights.length > 0 ? extractedFlights[currentLegIndex] : undefined;

  return (
    <Layout
      title={step === 'choice' ? 'Add flight' : step === 'pdf' ? 'Upload booking PDF' : 'Flight details'}
      headerRight={
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-2 -mr-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    >
      <div className="px-4 py-4">
        {step === 'choice' && (
          <div className="flex flex-col gap-4 mt-4">
            <h2 className="text-xl font-semibold text-white">How would you like to add this flight?</h2>

            <button
              onClick={() => setStep('pdf')}
              className="bg-slate-800 rounded-xl p-5 text-left border border-slate-700 hover:border-sky-600 active:scale-[0.99] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">Upload booking PDF</div>
                  <div className="text-sm text-slate-400">AI extracts all flight details automatically. Works with most airline booking confirmations.</div>
                  <div className="text-xs text-sky-400 mt-2 font-medium">Recommended</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setStep('form')}
              className="bg-slate-800 rounded-xl p-5 text-left border border-slate-700 hover:border-slate-600 active:scale-[0.99] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">Enter manually</div>
                  <div className="text-sm text-slate-400">Fill in flight details by hand. You can look up times by flight number.</div>
                </div>
              </div>
            </button>
          </div>
        )}

        {step === 'pdf' && (
          <PDFUpload
            onExtracted={handleExtracted}
            onSkip={() => setStep('form')}
          />
        )}

        {step === 'form' && (
          <div>
            {extractedFlights.length > 1 && (
              <div className="bg-sky-900/30 border border-sky-700 rounded-xl p-4 mb-5 text-sm text-sky-300">
                ✈️ Multi-leg booking detected — {extractedFlights.length} flights found.
                Saving leg {currentLegIndex + 1} of {extractedFlights.length}.
              </div>
            )}
            <FlightForm
              members={members}
              currentUserId={profile!.id}
              isAdmin={profile!.is_admin}
              prefill={currentPrefill}
              onSubmit={handleFormSubmit}
              submitLabel={
                extractedFlights.length > 1 && currentLegIndex < extractedFlights.length - 1
                  ? `Save & continue to leg ${currentLegIndex + 2}`
                  : 'Save flight'
              }
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
