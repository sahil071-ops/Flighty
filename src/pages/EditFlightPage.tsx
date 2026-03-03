import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { FlightForm, formDataToFlight } from '@/components/flights/FlightForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { utcToLocal } from '@/lib/timezone';
import type { Flight, Profile, FlightFormData } from '@/types';

export function EditFlightPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isOnline } = useOffline();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !profile?.group_id) return;
    Promise.all([
      supabase.from('flights').select('*').eq('id', id).maybeSingle(),
      supabase.from('profiles').select('*').eq('group_id', profile.group_id),
    ]).then(([flightRes, membersRes]) => {
      setFlight(flightRes.data);
      setMembers(membersRes.data ?? []);
      setLoading(false);
    });
  }, [id, profile?.group_id]);

  if (!isOnline) {
    return (
      <Layout title="Edit flight">
        <div className="px-4 py-8 text-center">
          <p className="text-slate-400">You're offline. Editing requires a connection.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </Layout>
    );
  }

  async function handleSubmit(data: FlightFormData, pdfFile?: File) {
    if (!flight) return;
    const flightData = formDataToFlight(data);

    const { error } = await supabase
      .from('flights')
      .update({ ...flightData, updated_at: new Date().toISOString() })
      .eq('id', flight.id);

    if (error) throw error;

    if (pdfFile && profile?.group_id) {
      const path = `${profile.group_id}/${flight.id}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('tickets')
        .upload(path, pdfFile, { contentType: 'application/pdf', upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('tickets').getPublicUrl(path);
        await supabase.from('flights').update({ ticket_pdf_url: urlData.publicUrl }).eq('id', flight.id);
      }
    }

    navigate(`/flights/${flight.id}`);
  }

  function flightToFormData(f: Flight): Partial<FlightFormData> {
    const { date: depDate, time: depTime } = utcToLocal(f.departure_datetime_utc, f.departure_timezone);
    const { date: arrDate, time: arrTime } = utcToLocal(f.arrival_datetime_utc, f.arrival_timezone);
    return {
      family_member_id: f.family_member_id,
      trip_name: f.trip_name ?? '',
      flight_number: f.flight_number,
      airline: f.airline ?? '',
      departure_airport_code: f.departure_airport_code,
      departure_airport_name: f.departure_airport_name ?? '',
      departure_city: f.departure_city ?? '',
      departure_date: depDate,
      departure_time: depTime,
      arrival_airport_code: f.arrival_airport_code,
      arrival_airport_name: f.arrival_airport_name ?? '',
      arrival_city: f.arrival_city ?? '',
      arrival_date: arrDate,
      arrival_time: arrTime,
      terminal_departure: f.terminal_departure ?? '',
      terminal_arrival: f.terminal_arrival ?? '',
      gate: f.gate ?? '',
      seat: f.seat ?? '',
      booking_reference: f.booking_reference ?? '',
      price: f.price ?? '',
      notes: f.notes ?? '',
    };
  }

  return (
    <Layout
      title="Edit flight"
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
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : !flight ? (
          <p className="text-slate-400 text-center py-8">Flight not found.</p>
        ) : (
          <FlightForm
            members={members}
            currentUserId={profile!.id}
            isAdmin={profile!.is_admin}
            initialData={flightToFormData(flight)}
            onSubmit={handleSubmit}
            submitLabel="Save changes"
          />
        )}
      </div>
    </Layout>
  );
}
