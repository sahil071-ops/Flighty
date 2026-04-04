import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FAMILY_MEMBERS } from '@/data/members';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Avatar } from '@/components/ui/Avatar';
import { localToUTC, getAirportTimezone } from '@/lib/timezone';
import type { FlightRequest, FlightRequestOption } from '@/types';

const inputClass =
  'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full';

export function TripFromRequestPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<FlightRequest | null>(null);
  const [approvedOption, setApprovedOption] = useState<FlightRequestOption | null>(null);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [requestId]);

  async function load() {
    if (!requestId) return;
    setLoading(true);
    try {
      const { data: req } = await supabase
        .from('flight_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!req) { setLoading(false); return; }
      setRequest(req as FlightRequest);

      if (!req.approved_option_id) { setLoading(false); return; }

      const { data: opt } = await supabase
        .from('flight_request_options')
        .select('*')
        .eq('id', req.approved_option_id)
        .single();

      if (opt) {
        const option = opt as FlightRequestOption;
        setApprovedOption(option);

        // Pre-fill form
        setTripName(req.label);
        setSelectedMemberIds([req.for_family_member_id]);

        if (option.legs.length > 0) {
          setStartDate(option.legs[0].departure_date);
          setEndDate(option.legs[option.legs.length - 1].arrival_date);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleMember(id: string) {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!request || !approvedOption) return;
    if (!tripName.trim()) { setError('Trip name is required.'); return; }
    if (!startDate) { setError('Start date is required.'); return; }
    if (selectedMemberIds.length === 0) { setError('Select at least one traveller.'); return; }

    setSaving(true);
    setError(null);

    try {
      // 1. Create trip
      const { data: trip, error: tripErr } = await supabase
        .from('trips')
        .insert({
          name: tripName.trim(),
          start_date: startDate,
          end_date: endDate || null,
          family_member_ids: selectedMemberIds,
        })
        .select()
        .single();

      if (tripErr) throw new Error(tripErr.message);

      // 2. Create flight legs for each selected member
      const flightRows = [];
      for (const memberId of selectedMemberIds) {
        for (let i = 0; i < approvedOption.legs.length; i++) {
          const leg = approvedOption.legs[i];
          const depTz = getAirportTimezone(leg.departure_airport_code) ?? 'UTC';
          const arrTz = getAirportTimezone(leg.arrival_airport_code) ?? 'UTC';
          const depUtc = localToUTC(leg.departure_date, leg.departure_time, depTz).toISOString();
          const arrUtc = localToUTC(leg.arrival_date, leg.arrival_time, arrTz).toISOString();

          flightRows.push({
            trip_id: trip.id,
            family_member_id: memberId,
            leg_order: i + 1,
            flight_number: leg.flight_number ?? 'TBD',
            airline: leg.airline ?? null,
            departure_airport_code: leg.departure_airport_code,
            departure_airport_name: null,
            departure_city: leg.departure_city ?? null,
            departure_datetime_utc: depUtc,
            departure_timezone: depTz,
            arrival_airport_code: leg.arrival_airport_code,
            arrival_airport_name: null,
            arrival_city: leg.arrival_city ?? null,
            arrival_datetime_utc: arrUtc,
            arrival_timezone: arrTz,
            booking_reference: null,
            price: approvedOption.price ?? null,
          });
        }
      }

      if (flightRows.length > 0) {
        const { error: flightsErr } = await supabase.from('flights').insert(flightRows);
        if (flightsErr) throw new Error(flightsErr.message);
      }

      // 3. Mark request as trip_created
      await supabase
        .from('flight_requests')
        .update({ status: 'trip_created', updated_at: new Date().toISOString() })
        .eq('id', request.id);

      navigate(`/trips/${trip.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create trip.');
    } finally {
      setSaving(false);
    }
  }

  const backButton = (
    <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-2 -ml-2">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </button>
  );

  if (loading) {
    return (
      <Layout title="Create Trip" headerRight={backButton} hideNav>
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      </Layout>
    );
  }

  if (!request || !approvedOption) {
    return (
      <Layout title="Create Trip" headerRight={backButton} hideNav>
        <div className="px-4 py-8 text-center">
          <p className="text-slate-400">
            {!request ? 'Request not found.' : 'No approved option found. Please approve an option first.'}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Create Trip" headerRight={backButton} hideNav>
      <form onSubmit={handleSubmit} className="px-4 py-4 pb-8 space-y-5">
        {/* Summary of what will be created */}
        <div className="bg-slate-800 rounded-xl border border-white/[.07] p-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
            From Option {approvedOption.option_number}
          </p>
          <div className="space-y-1.5">
            {approvedOption.legs.map((leg, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-slate-300">
                <span className="font-semibold text-white">
                  {leg.departure_airport_code} → {leg.arrival_airport_code}
                </span>
                <span className="text-slate-500">{leg.departure_date}</span>
                {leg.flight_number && (
                  <span className="text-slate-500">{leg.flight_number}</span>
                )}
              </div>
            ))}
          </div>
          {approvedOption.price && (
            <p className="text-[12px] text-emerald-400 mt-2 font-semibold">{approvedOption.price}</p>
          )}
        </div>

        {/* Trip name */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Trip name</label>
          <input
            type="text"
            value={tripName}
            onChange={e => setTripName(e.target.value)}
            placeholder="e.g. Paris Trip"
            className={inputClass}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Travellers */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">Travellers</label>
          <div className="flex flex-wrap gap-2">
            {FAMILY_MEMBERS.map(m => {
              const selected = selectedMemberIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                    selected
                      ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                      : 'border-white/[.08] bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Avatar name={m.name} colour={m.colour} size="sm" memberId={m.id} />
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Flight legs note */}
        <div className="bg-slate-800/60 rounded-lg px-3 py-2.5 border border-white/[.05]">
          <p className="text-[11px] text-slate-500">
            {approvedOption.legs.length} flight leg{approvedOption.legs.length !== 1 ? 's' : ''} will be created
            {selectedMemberIds.length > 1 ? ` for each of the ${selectedMemberIds.length} travellers` : ''}.
            You can edit details after creation.
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-cyan-400 text-black font-bold text-sm hover:bg-cyan-300 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <LoadingSpinner size="sm" />
              Creating…
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Trip
            </>
          )}
        </button>
      </form>
    </Layout>
  );
}
