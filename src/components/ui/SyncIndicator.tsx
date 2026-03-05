import { useState, useEffect } from 'react';
import { getSyncStatus, onSyncStatusChange } from '@/lib/backgroundSync';

export function SyncIndicator() {
  const [syncing, setSyncing] = useState(getSyncStatus() === 'syncing');

  useEffect(() => {
    return onSyncStatusChange(s => setSyncing(s === 'syncing'));
  }, []);

  if (!syncing) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 border border-slate-700 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-lg backdrop-blur pointer-events-none">
      <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      <span className="text-xs text-slate-400 whitespace-nowrap">Syncing files...</span>
    </div>
  );
}
