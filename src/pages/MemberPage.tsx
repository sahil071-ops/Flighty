import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { getCachedFlights, getCachedProfiles } from '@/lib/db';
import { Layout } from '@/components/layout/Layout';
import { FlightCard } from '@/components/flights/FlightCard';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Flight, Profile } from '@/types';

export function MemberPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { profile: currentProfile } = useAuth();
  const { isOnline } = useOffline();
  const [member, setMember] = useState<Profile | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) return;
    loadData();
  }, [memberId, isOnline]);

  async function loadData() {
    try {
      if (isOnline) {
        const [profileRes, flightsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', memberId).maybeSingle(),
          supabase
            .from('flights')
            .select('*')
            .eq('family_member_id', memberId)
            .order('departure_datetime_utc', { ascending: true }),
        ]);
        setMember(profileRes.data);
        setFlights(flightsRes.data ?? []);
      } else {
        const [profiles, cached] = await Promise.all([getCachedProfiles(), getCachedFlights()]);
        setMember(profiles.find(p => p.id === memberId) ?? null);
        setFlights(
          cached
            .filter(f => f.family_member_id === memberId)
            .sort((a, b) => a.departure_datetime_utc.localeCompare(b.departure_datetime_utc))
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const now = new Date().toISOString();
  const upcoming = flights.filter(f => f.arrival_datetime_utc >= now);
  const past = flights.filter(f => f.arrival_datetime_utc < now).reverse();

  return (
    <Layout
      title={member?.display_name ?? 'Member'}
      headerRight={
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-2 -mr-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    >
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {member && (
              <div className="flex items-center gap-4 bg-slate-800 rounded-xl p-4 mb-6">
                <Avatar name={member.display_name} colour={member.avatar_colour} size="lg" />
                <div>
                  <div className="font-semibold text-white text-lg">{member.display_name}</div>
                  <div className="text-sm text-slate-400">
                    {upcoming.length} upcoming · {past.length} past
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {upcoming.length > 0 && (
                <>
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Upcoming</h2>
                  {upcoming.map(f => (
                    <FlightCard key={f.id} flight={f} profile={member ?? undefined} showMember={false} />
                  ))}
                </>
              )}
              {past.length > 0 && (
                <>
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mt-4 border-t border-slate-800 pt-4">Past flights</h2>
                  {past.map(f => (
                    <FlightCard key={f.id} flight={f} profile={member ?? undefined} showMember={false} />
                  ))}
                </>
              )}
              {flights.length === 0 && (
                <p className="text-center text-slate-500 py-8">No flights for this member.</p>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
