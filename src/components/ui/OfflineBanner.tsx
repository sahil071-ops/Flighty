import { useOffline } from '@/context/OfflineContext';

export function OfflineBanner() {
  const { isOnline } = useOffline();
  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-amber-950 text-center text-sm font-medium px-4 py-2">
      You're offline — showing cached data. Changes are disabled.
    </div>
  );
}
