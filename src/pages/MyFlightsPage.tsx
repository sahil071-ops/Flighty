import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { getCachedFlights } from '@/lib/db';
import { Layout } from '@/components/layout/Layout';
import { FlightCard } from '@/components/flights/FlightCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Flight } from '@/types';

export function MyFlightsPage() {
  const { profile } = useAuth();
  const { isOnline } = useOffline();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    loadFlights();
  }, [profile, isOnline]);

  async function loadFlights() {
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('flights')
          .select('*')
          .eq('family_member_id', profile!.id)
          .order('departure_datetime_utc', { ascending: true });
        if (error) throw error;
        setFlights(data ?? []);
      } else {
        const cached = await getCachedFlights();
        const mine = cached
          .filter(f => f.family_member_id === profile!.id)
          .sort((a, b) => a.departure_datetime_utc.localeCompare(b.departure_datetime_utc));
        setFlights(mine);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flights.');
    } finally {
      setLoading(false);
    }
  }

  const now = new Date().toISOString();
  const upcoming = flights.filter(f => f.arrival_datetime_utc >= now);
  const past = flights.filter(f => f.arrival_datetime_utc < now).reverse();

  const addButton = (
    <Link
      to="/flights/add"
      className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white hover:bg-sky-400 transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </Link>
  );

  return (
    <Layout title="My Flights" headerRight={!isOnline ? undefined : addButton}>
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-sm text-red-300">
            {error}
          </div>
        ) : flights.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✈️</div>
            <h2 className="text-lg font-semibold text-white mb-2">No flights yet</h2>
            {!isOnline ? (
              <p className="text-slate-500 text-sm">You're offline — no cached flights found.</p>
            ) : (
              <Link to="/flights/add" className="inline-flex items-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-sky-400 transition-colors mt-4">
                Add a flight
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.length > 0 && (
              <>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mt-1">Upcoming</h2>
                {upcoming.map(f => (
                  <FlightCard key={f.id} flight={f} profile={profile ?? undefined} showMember={false} />
                ))}
              </>
            )}
            {past.length > 0 && (
              <>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mt-4 border-t border-slate-800 pt-4">
                  Past flights
                </h2>
                {past.map(f => (
                  <FlightCard key={f.id} flight={f} profile={profile ?? undefined} showMember={false} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
