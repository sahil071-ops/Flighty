import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VERSION } from '@/version';
import { VERSION_HISTORY } from '@/versionHistory';
import { syncAllData, syncAllFiles } from '@/lib/backgroundSync';

export function WhatsNewPage() {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  async function handleSyncNow() {
    setSyncing(true);
    setSyncDone(false);
    try {
      await Promise.all([syncAllData(), syncAllFiles()]);
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 3000);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header
        className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white p-3 -ml-3 flex items-center justify-center"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-white flex-1">What's New</h1>
          <span className="text-xs text-slate-500">v{VERSION}</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-8">
        {/* Sync Now */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-6">
          <p className="text-sm font-medium text-white mb-1">Offline sync</p>
          <p className="text-xs text-slate-500 mb-3">
            Downloads all data and files for offline access. Runs automatically on app open.
          </p>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {syncing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Syncing…
              </>
            ) : syncDone ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Sync complete
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Sync now
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {VERSION_HISTORY.map((entry, idx) => (
            <div key={entry.version} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className={`text-sm font-bold ${idx === 0 ? 'text-sky-400' : 'text-white'}`}>
                  v{entry.version}
                </span>
                {idx === 0 && (
                  <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/40 px-1.5 py-0.5 rounded font-medium">
                    Current
                  </span>
                )}
                <span className="text-xs text-slate-500 ml-auto">{entry.date}</span>
              </div>
              <div className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
                <ul className="flex flex-col gap-2">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-sky-500 mt-0.5 flex-shrink-0">•</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
