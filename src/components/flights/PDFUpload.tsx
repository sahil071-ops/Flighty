import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { extractFlightsFromPDF, fileToBase64, type ExtractedFlight } from '@/lib/claudeApi';

interface PDFUploadProps {
  onExtracted: (flights: ExtractedFlight[], file: File) => void;
  onSkip: () => void;
}

export function PDFUpload({ onExtracted, onSkip }: PDFUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('PDF file must be under 20 MB.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const flights = await extractFlightsFromPDF(base64);
      if (!flights.length) {
        setError('No flight details found in this PDF. Try manual entry.');
        return;
      }
      onExtracted(flights, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse PDF. Try manual entry.');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Add flight from PDF</h2>
        <p className="text-sm text-slate-400">
          Upload your booking confirmation PDF and we'll extract the details automatically.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${dragging ? 'border-sky-400 bg-sky-900/20' : 'border-slate-600 hover:border-slate-500'}
          ${loading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
        `}
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-slate-300 font-medium">Extracting flight details…</p>
            <p className="text-sm text-slate-500">This usually takes 10–20 seconds</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <svg className="w-12 h-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <div>
              <p className="text-slate-300 font-medium">Drop your PDF here</p>
              <p className="text-sm text-slate-500 mt-1">or tap to browse</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Button variant="ghost" onClick={onSkip} className="w-full">
        Skip — enter manually instead
      </Button>
    </div>
  );
}
