import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { parseBCBP, convertIfHeic } from '@/lib/documentParser';
import { cacheBoardingPasses, deleteCachedBoardingPass } from '@/lib/db';
import { Button } from '@/components/ui/Button';
import type { BoardingPass, Flight } from '@/types';

interface BoardingPassSectionProps {
  flight: Flight;
  boardingPass: BoardingPass | null;
  onUpdate: (bp: BoardingPass | null) => void;
}

export function BoardingPassSection({ flight, boardingPass, onUpdate }: BoardingPassSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    setError(null);
    setParsing(true);

    try {
      const processedFile = await convertIfHeic(file);

      // Tier 1: Try BCBP barcode parsing
      let parsedData: Partial<BoardingPass> = {};
      const bcbpResult = await parseBCBP(processedFile);

      if (bcbpResult.confidence === 'high') {
        parsedData = {
          passenger_name: bcbpResult.passenger_name,
          seat: bcbpResult.seat,
          gate: bcbpResult.gate,
          departure_date: bcbpResult.departure_date,
          sequence_number: bcbpResult.sequence_number,
          fare_class: bcbpResult.fare_class,
        };
      }
      // For boarding passes we don't fall back to Claude - we just save what we have
      // and let the user see/edit the boarding pass image

      setParsing(false);
      setUploading(true);

      // Upload file to Supabase Storage
      const ext = processedFile.type === 'application/pdf' ? 'pdf' : 'jpg';
      const storagePath = `${flight.trip_id}/${flight.id}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('boarding-passes')
        .upload(storagePath, processedFile, { contentType: processedFile.type, upsert: true });

      if (uploadErr) throw new Error(uploadErr.message);

      // Save to database
      const payload = {
        flight_id: flight.id,
        trip_id: flight.trip_id,
        passenger_name: parsedData.passenger_name ?? null,
        gate: parsedData.gate ?? null,
        seat: parsedData.seat ?? flight.seat ?? null,
        boarding_time: null,
        departure_time: parsedData.departure_date ?? null,
        departure_date: parsedData.departure_date ?? null,
        sequence_number: parsedData.sequence_number ?? null,
        fare_class: parsedData.fare_class ?? null,
        has_qr_code: true,
        file_url: storagePath,
        file_type: ext === 'pdf' ? 'pdf' : 'image',
      };

      let bp: BoardingPass;
      if (boardingPass) {
        const { data, error: upErr } = await supabase
          .from('boarding_passes')
          .update(payload)
          .eq('id', boardingPass.id)
          .select()
          .single();
        if (upErr) throw new Error(upErr.message);
        bp = data as BoardingPass;
      } else {
        const { data, error: insErr } = await supabase
          .from('boarding_passes')
          .insert(payload)
          .select()
          .single();
        if (insErr) throw new Error(insErr.message);
        bp = data as BoardingPass;
      }

      await cacheBoardingPasses([bp]);
      onUpdate(bp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setParsing(false);
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!boardingPass) return;
    if (!confirm('Delete this boarding pass?')) return;
    try {
      if (boardingPass.file_url) {
        await supabase.storage.from('boarding-passes').remove([boardingPass.file_url]);
      }
      await supabase.from('boarding_passes').delete().eq('id', boardingPass.id);
      await deleteCachedBoardingPass(boardingPass.id);
      onUpdate(null);
      setQrUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleShowQR() {
    if (!boardingPass?.file_url) return;
    try {
      const { data, error } = await supabase.storage
        .from('boarding-passes')
        .createSignedUrl(boardingPass.file_url, 300);
      if (error || !data?.signedUrl) throw new Error('Could not load boarding pass');
      setQrUrl(data.signedUrl);
      setShowQR(true);

      // Boost screen brightness
      if ('screen' in window && 'orientation' in window.screen) {
        try {
          const wl = navigator as { wakeLock?: { request: (type: string) => Promise<unknown> } };
          wl.wakeLock?.request('screen');
        } catch { /* non-critical */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load QR code');
    }
  }

  async function handleDownload() {
    if (!boardingPass?.file_url) return;
    try {
      const { data, error } = await supabase.storage
        .from('boarding-passes')
        .createSignedUrl(boardingPass.file_url, 120);
      if (error || !data?.signedUrl) throw new Error('Could not generate download URL');
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = `boarding-pass-${flight.flight_number}`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  }

  const isLoading = uploading || parsing;
  const loadingMsg = parsing ? 'Reading barcode…' : 'Uploading…';

  return (
    <>
      <div className="bg-slate-800 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Boarding Pass</h3>
          {boardingPass && (
            <button onClick={handleDelete} className="text-red-400 hover:text-red-300 text-xs transition-colors">
              Delete
            </button>
          )}
        </div>

        {!boardingPass ? (
          <div>
            <p className="text-xs text-slate-500 mb-3">
              Upload your boarding pass (PDF, photo, or HEIC). Barcode data is extracted automatically.
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sky-400 text-sm py-2">
                <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                {loadingMsg}
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 bg-sky-500/10 border border-sky-700 rounded-lg px-4 py-3 cursor-pointer hover:bg-sky-500/20 transition-colors">
                <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-sm text-sky-400 font-medium">Upload Boarding Pass</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                />
              </label>
            )}
          </div>
        ) : (
          <div>
            {/* Key info prominently */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {boardingPass.gate && (
                <div className="bg-slate-700 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-white">{boardingPass.gate}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">Gate</div>
                </div>
              )}
              {boardingPass.seat && (
                <div className="bg-slate-700 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-white">{boardingPass.seat}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">Seat</div>
                </div>
              )}
              {boardingPass.boarding_time && (
                <div className="bg-slate-700 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-white">{boardingPass.boarding_time}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">Boarding</div>
                </div>
              )}
            </div>

            {boardingPass.passenger_name && (
              <p className="text-xs text-slate-400 mb-3">{boardingPass.passenger_name}</p>
            )}

            <div className="flex gap-2">
              <Button variant="primary" onClick={handleShowQR} className="flex-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                </svg>
                Show QR Code
              </Button>
              <Button variant="secondary" onClick={handleDownload}>
                Download
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {/* Full-screen QR modal */}
      {showQR && qrUrl && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center"
          onClick={() => setShowQR(false)}
        >
          <div className="w-full max-w-sm px-4">
            {boardingPass?.gate && (
              <div className="text-center mb-4">
                <div className="text-5xl font-black text-slate-900">Gate {boardingPass.gate}</div>
                {boardingPass.seat && (
                  <div className="text-2xl font-bold text-slate-600 mt-1">Seat {boardingPass.seat}</div>
                )}
              </div>
            )}
            <img
              src={qrUrl}
              alt="Boarding pass"
              className="w-full rounded-lg shadow-xl"
              style={{ imageRendering: 'pixelated' }}
            />
            <p className="text-center text-slate-400 text-sm mt-4">Tap anywhere to close</p>
          </div>
        </div>
      )}
    </>
  );
}
