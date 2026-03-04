import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { getCachedFlights, cacheFlights } from '@/lib/db';
import { getMember } from '@/data/members';
import { Layout } from '@/components/layout/Layout';
import { FlightCard } from '@/components/flights/FlightCard';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Flight } from '@/types';

export function MyFlightsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentMember } = useApp();
  const { isOnline } = useOffline();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const member = getMember(id ?? '');
  const isAdmin = currentMember?.isAdmin ?? false;

  // Admin viewing /member/admin sees all flights across all members
  const isAdminView = isAdmin && id === 'admin';

  useEffect(() => {
    if (!member) return;
    loadFlights();
  }, [id, isOnline]);

  async function loadFlights() {
    try {
      if (isOnline) {
        let query = supabase
          .from('flights')
          .select('*')
          .order('departure_datetime_utc', { ascending: true });

        if (!isAdminView) {
          query = query.eq('family_member_id', id!);
        }

        const { data, error } = await query;
        if (error) throw error;
        const result = data ?? [];
        setFlights(result);
        if (result.length > 0) cacheFlights(result);
      } else {
        const cached = await getCachedFlights();
        const filtered = isAdminView
          ? cached
          : cached.filter(f => f.family_member_id === id);
        setFlights(filtered.sort((a, b) =>
          a.departure_datetime_utc.localeCompare(b.departure_datetime_utc)
        ));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flights.');
    } finally {
      setLoading(false);
    }
  }

  if (!member) {
    return (
      <Layout title="Not found" hideNav>
        <div className="text-center py-16 px-4">
          <p className="text-slate-400">Member not found.</p>
          <button onClick={() => navigate('/')} className="text-sky-400 text-sm mt-4 block mx-auto">
            Go back
          </button>
        </div>
      </Layout>
    );
  }

  const now = new Date().toISOString();
  const upcoming = flights.filter(f => f.arrival_datetime_utc >= now);
  const past = flights.filter(f => f.arrival_datetime_utc < now).reverse();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white p-2 -ml-2"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <Avatar name={member.name} colour={member.colour} size="sm" />
          <span className="text-base font-semibold text-white flex-1">{member.name}</span>
          {isAdmin && isOnline && (
            <Link
              to="/flights/add"
              className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white hover:bg-sky-400 transition-colors"
              aria-label="Add flight"
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
        ) : flights.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✈️</div>
            <h2 className="text-lg font-semibold text-white mb-2">No flights yet</h2>
            {!isOnline ? (
              <p className="text-slate-500 text-sm">You're offline — no cached flights found.</p>
            ) : isAdmin ? (
              <Link
                to="/flights/add"
                className="inline-flex items-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-sky-400 transition-colors mt-4"
              >
                Add a flight
              </Link>
            ) : (
              <p className="text-slate-500 text-sm">No flights added yet.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.length > 0 && (
              <>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mt-1">Upcoming</h2>
                {upcoming.map(f => (
                  <FlightCard
                    key={f.id}
                    flight={f}
                    member={isAdminView ? getMember(f.family_member_id) : member}
                    showMember={isAdminView}
                  />
                ))}
              </>
            )}
            {past.length > 0 && (
              <>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mt-4 border-t border-slate-800 pt-4">
                  Past flights
                </h2>
                {past.map(f => (
                  <FlightCard
                    key={f.id}
                    flight={f}
                    member={isAdminView ? getMember(f.family_member_id) : member}
                    showMember={isAdminView}
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
