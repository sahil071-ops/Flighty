import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { cacheFlights, cacheProfiles, getCachedFlights, getCachedProfiles } from '@/lib/db';
import { Layout } from '@/components/layout/Layout';
import { FlightCard } from '@/components/flights/FlightCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Flight, Profile } from '@/types';

export function HomePage() {
  const { profile } = useAuth();
  const { isOnline } = useOffline();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.group_id) return;
    loadData();
  }, [profile?.group_id, isOnline]);

  async function loadData() {
    try {
      if (isOnline) {
        // Fetch from Supabase
        const [flightsRes, profilesRes] = await Promise.all([
          supabase
            .from('flights')
            .select('*')
            .eq('group_id', profile!.group_id)
            .order('departure_datetime_utc', { ascending: true }),
          supabase
            .from('profiles')
            .select('*')
            .eq('group_id', profile!.group_id),
        ]);

        if (flightsRes.error) throw flightsRes.error;
        if (profilesRes.error) throw profilesRes.error;

        const fetchedFlights = flightsRes.data ?? [];
        const fetchedProfiles = profilesRes.data ?? [];

        // Cache for offline
        await cacheFlights(fetchedFlights);
        await cacheProfiles(fetchedProfiles);

        setFlights(fetchedFlights);
        const profileMap = new Map(fetchedProfiles.map(p => [p.id, p]));
        setProfiles(profileMap);
      } else {
        // Load from IndexedDB
        const [cachedFlights, cachedProfiles] = await Promise.all([
          getCachedFlights(),
          getCachedProfiles(),
        ]);
        const sorted = cachedFlights
          .filter(f => f.group_id === profile!.group_id)
          .sort((a, b) => a.departure_datetime_utc.localeCompare(b.departure_datetime_utc));
        setFlights(sorted);
        const profileMap = new Map(cachedProfiles.map(p => [p.id, p]));
        setProfiles(profileMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flights.');
    } finally {
      setLoading(false);
    }
  }

  const now = new Date().toISOString();
  const upcomingFlights = flights.filter(f => f.arrival_datetime_utc >= now);
  const pastFlights = flights.filter(f => f.arrival_datetime_utc < now).reverse();

  // Group by trip_id
  function groupFlights(list: Flight[]) {
    const groups: Map<string, Flight[]> = new Map();
    const ungrouped: Flight[] = [];
    for (const f of list) {
      if (f.trip_id) {
        const key = f.trip_id;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(f);
      } else {
        ungrouped.push(f);
      }
    }
    return { groups, ungrouped };
  }

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

  const { groups: upcomingGroups, ungrouped: upcomingUngrouped } = groupFlights(upcomingFlights);

  return (
    <Layout title="FamilyFlights" headerRight={!isOnline ? undefined : addButton}>
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-sm text-red-300 mt-4">
            {error}
          </div>
        ) : upcomingFlights.length === 0 && pastFlights.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">✈️</div>
            <h2 className="text-lg font-semibold text-white mb-2">No flights yet</h2>
            <p className="text-slate-400 text-sm mb-6">Add your first flight to get started.</p>
            {!isOnline ? (
              <p className="text-slate-500 text-sm">You're offline — connect to add flights.</p>
            ) : (
              <Link
                to="/flights/add"
                className="inline-flex items-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-sky-400 transition-colors"
              >
                Add first flight
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Upcoming flights */}
            {upcomingFlights.length > 0 && (
              <>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mt-1">
                  Upcoming
                </h2>

                {/* Grouped trips */}
                {Array.from(upcomingGroups.entries()).map(([tripId, tripFlights]) => (
                  <div key={tripId} className="flex flex-col gap-2">
                    {tripFlights[0].trip_name && (
                      <div className="flex items-center gap-2 px-1">
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="text-xs text-slate-400 font-medium">{tripFlights[0].trip_name}</span>
                      </div>
                    )}
                    {tripFlights.map(f => (
                      <FlightCard key={f.id} flight={f} profile={profiles.get(f.family_member_id)} />
                    ))}
                  </div>
                ))}

                {/* Ungrouped */}
                {upcomingUngrouped.map(f => (
                  <FlightCard key={f.id} flight={f} profile={profiles.get(f.family_member_id)} />
                ))}
              </>
            )}

            {/* Past flights toggle */}
            {pastFlights.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowPast(!showPast)}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors w-full px-1 py-2"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showPast ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {showPast ? 'Hide' : 'Show'} {pastFlights.length} past flight{pastFlights.length !== 1 ? 's' : ''}
                </button>
                {showPast && (
                  <div className="flex flex-col gap-3 mt-2">
                    {pastFlights.map(f => (
                      <FlightCard key={f.id} flight={f} profile={profiles.get(f.family_member_id)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
