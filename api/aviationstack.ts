import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.VITE_AVIATIONSTACK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AviationStack API key not configured' });
  }

  const { flight_iata, flight_date } = req.query;
  if (!flight_iata) {
    return res.status(400).json({ error: 'flight_iata is required' });
  }

  const params = new URLSearchParams({
    access_key: apiKey,
    flight_iata: String(flight_iata),
  });
  if (flight_date) params.set('flight_date', String(flight_date));

  try {
    // AviationStack free tier uses HTTP; this server-side proxy handles it
    const upstream = await fetch(`http://api.aviationstack.com/v1/flights?${params}`);
    const data = await upstream.json();

    // AviationStack returns HTTP 200 even for errors — surface them properly
    if (data?.error) {
      const code = data.error?.code;
      const msg = data.error?.message ?? 'AviationStack API error';
      const status = code === 101 ? 401 : code === 104 ? 429 : 502;
      return res.status(status).json({ error: msg });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach AviationStack' });
  }
}
