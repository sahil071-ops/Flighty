export interface ExtractedFlight {
  flight_number: string | null;
  airline: string | null;
  departure_airport_code: string | null;
  departure_airport_name: string | null;
  departure_city: string | null;
  departure_date: string | null; // YYYY-MM-DD local
  departure_time: string | null; // HH:MM 24hr local
  arrival_airport_code: string | null;
  arrival_airport_name: string | null;
  arrival_city: string | null;
  arrival_date: string | null; // YYYY-MM-DD local
  arrival_time: string | null; // HH:MM 24hr local
  booking_reference: string | null;
  seat: string | null;
  terminal_departure: string | null;
  terminal_arrival: string | null;
}

const SYSTEM_PROMPT = `You are a flight booking parser. Extract all flight details from this booking confirmation PDF and return ONLY a JSON array (no markdown, no preamble). Each element represents one flight leg with these fields: flight_number, airline, departure_airport_code, departure_airport_name, departure_city, departure_date (YYYY-MM-DD), departure_time (HH:MM 24hr local), arrival_airport_code, arrival_airport_name, arrival_city, arrival_date (YYYY-MM-DD), arrival_time (HH:MM 24hr local), booking_reference, seat (or null), terminal_departure (or null), terminal_arrival (or null). If any field cannot be determined, use null.`;

export async function extractFlightsFromPDF(
  pdfBase64: string
): Promise<ExtractedFlight[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string;
  if (!apiKey) {
    throw new Error('Anthropic API key not configured. Set VITE_ANTHROPIC_API_KEY in your .env file.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: 'Extract all flight legs from this booking confirmation.',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text ?? '';

  try {
    // Strip any accidental markdown fences
    const clean = content.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) throw new Error('Expected array from Claude');
    return parsed as ExtractedFlight[];
  } catch {
    throw new Error(`Failed to parse Claude response: ${content.slice(0, 200)}`);
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:application/pdf;base64,<data>"
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
