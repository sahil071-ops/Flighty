export interface AviationStackFlight {
  flight_number: string;
  airline: string;
  departure_airport_code: string;
  departure_airport_name: string;
  departure_city: string;
  departure_scheduled: string; // ISO datetime
  arrival_airport_code: string;
  arrival_airport_name: string;
  arrival_city: string;
  arrival_scheduled: string; // ISO datetime
}

export async function lookupFlight(
  flightNumber: string,
  date: string // YYYY-MM-DD
): Promise<AviationStackFlight | null> {
  const apiKey = import.meta.env.VITE_AVIATIONSTACK_API_KEY as string;
  if (!apiKey) return null;

  try {
    // Use Vercel edge function proxy to handle HTTP→HTTPS and hide API key
    const params = new URLSearchParams({
      flight_iata: flightNumber.toUpperCase(),
      flight_date: date,
    });

    const response = await fetch(`/api/aviationstack?${params}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const flight = data?.data?.[0];
    if (!flight) return null;

    return {
      flight_number: flight.flight?.iata ?? flightNumber,
      airline: flight.airline?.name ?? '',
      departure_airport_code: flight.departure?.iata ?? '',
      departure_airport_name: flight.departure?.airport ?? '',
      departure_city: flight.departure?.timezone?.split('/').pop()?.replace(/_/g, ' ') ?? '',
      departure_scheduled: flight.departure?.scheduled ?? '',
      arrival_airport_code: flight.arrival?.iata ?? '',
      arrival_airport_name: flight.arrival?.airport ?? '',
      arrival_city: flight.arrival?.timezone?.split('/').pop()?.replace(/_/g, ' ') ?? '',
      arrival_scheduled: flight.arrival?.scheduled ?? '',
    };
  } catch {
    return null;
  }
}
