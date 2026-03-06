import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      className="fixed left-4 right-4 z-50 bg-slate-800 border border-slate-600 rounded-xl p-4 shadow-2xl max-w-sm mx-auto"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
    >
      <p className="text-sm text-slate-200 mb-3 font-medium">
        A new version of FamilyFlights is available
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-1 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          Update now
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-slate-400 hover:text-white text-sm py-2.5 px-4 rounded-lg transition-colors border border-slate-700 hover:border-slate-500"
        >
          Later
        </button>
      </div>
    </div>
  );
}
