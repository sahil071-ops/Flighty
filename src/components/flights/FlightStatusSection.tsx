import { useState } from 'react';
import { fetchFlightStatus, statusLabel, statusColor, formatDelay, cacheAgeMinutes } from '@/lib/flightStatus';
import type { FlightStatus } from '@/types';
import type { Flight } from '@/types';

interface FlightStatusSectionProps {
  flight: Flight;
  initialStatus?: FlightStatus | null;
}

function fmtTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function FlightStatusSection({ flight, initialStatus }: FlightStatusSectionProps) {
  const [status, setStatus] = useState<FlightStatus | null>(initialStatus ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageMinutes, setAgeMinutes] = useState<number | null>(
    initialStatus ? cacheAgeMinutes(initialStatus) : null
  );

  const flightDate = flight.departure_datetime_utc.slice(0, 10);

  async function handleFetch() {
    setLoading(true);
    setError(null);
    const result = await fetchFlightStatus(flight.flight_number, flightDate);
    setLoading(false);
    if (result.error && !result.status) {
      setError(result.error);
    } else if (result.status) {
      setStatus(result.status);
      setAgeMinutes(result.cacheAgeMinutes ?? 0);
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Live Status</h3>
        <span className="text-[10px] text-slate-600">AviationStack</span>
      </div>

      {!status && !loading && (
        <div>
          <p className="text-xs text-slate-500 mb-3">
            Fetch live departure and arrival status. Uses your API quota — tap only when needed.
          </p>
          <button
            onClick={handleFetch}
            className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Check live status
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sky-400 text-sm py-2">
          <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          Fetching status…
        </div>
      )}

      {status && !loading && (
        <div>
          {/* Status badge */}
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${statusColor(status.status)}`}>
              {statusLabel(status.status)}
            </span>
            {ageMinutes !== null && (
              <span className="text-xs text-slate-500">
                {ageMinutes === 0 ? 'Just updated' : `${ageMinutes}m ago`}
              </span>
            )}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Departure</p>
              <p className="text-sm font-medium text-white">
                {fmtTime(status.departure_actual ?? status.departure_scheduled) ?? '–'}
              </p>
              {status.departure_actual && status.departure_scheduled &&
               status.departure_actual !== status.departure_scheduled && (
                <p className="text-[11px] text-slate-500 line-through">
                  {fmtTime(status.departure_scheduled)}
                </p>
              )}
              {status.departure_delay && status.departure_delay > 0 && (
                <p className="text-xs text-amber-400 font-medium">
                  Delayed {formatDelay(status.departure_delay)}
                </p>
              )}
              {status.departure_gate && (
                <p className="text-xs text-slate-400 mt-1">Gate {status.departure_gate}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Arrival</p>
              <p className="text-sm font-medium text-white">
                {fmtTime(status.arrival_actual ?? status.arrival_scheduled) ?? '–'}
              </p>
              {status.arrival_actual && status.arrival_scheduled &&
               status.arrival_actual !== status.arrival_scheduled && (
                <p className="text-[11px] text-slate-500 line-through">
                  {fmtTime(status.arrival_scheduled)}
                </p>
              )}
              {status.arrival_delay && status.arrival_delay > 0 && (
                <p className="text-xs text-amber-400 font-medium">
                  Delayed {formatDelay(status.arrival_delay)}
                </p>
              )}
              {status.arrival_gate && (
                <p className="text-xs text-slate-400 mt-1">Gate {status.arrival_gate}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleFetch}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
