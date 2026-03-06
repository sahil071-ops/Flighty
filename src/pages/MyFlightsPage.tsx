import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { getCachedTrips, getCachedFlights, getCachedHotels, cacheTrips, cacheFlights, cacheHotels } from '@/lib/db';
import { getMember } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TripCard } from '@/components/trips/TripCard';
import type { Trip, Flight, Hotel } from '@/types';

export function MyFlightsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentMember } = useApp();
  const { isOnline } = useOffline();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [flightsByTrip, setFlightsByTrip] = useState<Map<string, Flight[]>>(new Map());
  const [hotelsByTrip, setHotelsByTrip] = useState<Map<string, Hotel[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const member = getMember(id ?? '');
  useEffect(() => {
    load();
  }, [id, isOnline]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (isOnline) {
        let tripsQuery = supabase.from('trips').select('*').order('start_date', { ascending: false });
        if (id) {
          tripsQuery = tripsQuery.contains('family_member_ids', [id]);
        }
        const { data: tripsData, error: tripsError } = await tripsQuery;
        if (tripsError) throw tripsError;
        const loadedTrips = tripsData ?? [];
        setTrips(loadedTrips);

        if (loadedTrips.length > 0) {
          const tripIds = loadedTrips.map(t => t.id);
          const [{ data: flightsData }, { data: hotelsData }] = await Promise.all([
            supabase.from('flights').select('*').in('trip_id', tripIds),
            supabase.from('hotels').select('*').in('trip_id', tripIds),
          ]);

          const fMap = new Map<string, Flight[]>();
          for (const f of flightsData ?? []) {
            const arr = fMap.get(f.trip_id) ?? [];
            arr.push(f);
            fMap.set(f.trip_id, arr);
          }
          setFlightsByTrip(fMap);

          const hMap = new Map<string, Hotel[]>();
          for (const h of hotelsData ?? []) {
            const arr = hMap.get(h.trip_id) ?? [];
            arr.push(h);
            hMap.set(h.trip_id, arr);
          }
          setHotelsByTrip(hMap);

          // Cache for offline access
          const writes: Promise<void>[] = [cacheTrips(loadedTrips)];
          if (flightsData?.length) writes.push(cacheFlights(flightsData));
          if (hotelsData?.length) writes.push(cacheHotels(hotelsData));
          Promise.all(writes).catch(() => { /* non-critical */ });
        } else {
          setFlightsByTrip(new Map());
          setHotelsByTrip(new Map());
        }
      } else {
        const [cachedTrips, cachedFlights, cachedHotels] = await Promise.all([
          getCachedTrips(),
          getCachedFlights(),
          getCachedHotels(),
        ]);
        const filtered = cachedTrips.filter(t => id && t.family_member_ids.includes(id));
        setTrips(filtered.sort((a, b) => b.start_date.localeCompare(a.start_date)));

        const fMap = new Map<string, Flight[]>();
        for (const f of cachedFlights) {
          if (!f.trip_id) continue;
          const arr = fMap.get(f.trip_id) ?? [];
          arr.push(f);
          fMap.set(f.trip_id, arr);
        }
        setFlightsByTrip(fMap);

        const hMap = new Map<string, Hotel[]>();
        for (const h of cachedHotels) {
          const arr = hMap.get(h.trip_id) ?? [];
          arr.push(h);
          hMap.set(h.trip_id, arr);
        }
        setHotelsByTrip(hMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trips.');
    } finally {
      setLoading(false);
    }
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
        <p className="text-slate-400">Member not found.</p>
        <button onClick={() => navigate('/')} className="text-sky-400 text-sm mt-4">Go back</button>
      </div>
    );
  }

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = trips.filter(t => (t.end_date ?? t.start_date) >= now);
  const past = trips.filter(t => (t.end_date ?? t.start_date) < now);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header
        className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white p-3 -ml-3 flex items-center justify-center"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          {member && <Avatar name={member.name} colour={member.colour} size="sm" />}
          <span className="text-base font-semibold text-white flex-1">
            {member?.name ?? 'All trips'}
          </span>
          {isOnline && (
            <Link
              to="/trips/new"
              className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white hover:bg-sky-400 transition-colors"
              aria-label="Add trip"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-sm text-red-300">
            {error}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✈️</div>
            <h2 className="text-lg font-semibold text-white mb-2">No trips yet</h2>
            {!isOnline ? (
              <p className="text-slate-500 text-sm">You're offline — no cached trips found.</p>
            ) : (
              <Link
                to="/trips/new"
                className="inline-flex items-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-sky-400 transition-colors mt-4"
              >
                Add a trip
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.length > 0 && (
              <>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mt-1">Upcoming</h2>
                {upcoming.map(trip => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    flights={flightsByTrip.get(trip.id) ?? []}
                    hotels={hotelsByTrip.get(trip.id) ?? []}
                  />
                ))}
              </>
            )}
            {past.length > 0 && (
              <>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mt-4 border-t border-slate-800 pt-4">
                  Past trips
                </h2>
                {past.map(trip => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    flights={flightsByTrip.get(trip.id) ?? []}
                    hotels={hotelsByTrip.get(trip.id) ?? []}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
