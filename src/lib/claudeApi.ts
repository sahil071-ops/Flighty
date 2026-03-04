// ── Extracted flight type ──────────────────────────────────────────────────────

export interface ExtractedFlight {
  passenger_name: string | null;
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
  arrival_date: string | null;  // YYYY-MM-DD local
  arrival_time: string | null;  // HH:MM 24hr local
  booking_reference: string | null;
  seat: string | null;
  terminal_departure: string | null;
  terminal_arrival: string | null;
}

// ── Extracted hotel type ───────────────────────────────────────────────────────

export interface ExtractedHotel {
  hotel_name: string | null;
  city: string | null;
  country: string | null;
  check_in_date: string | null;
  check_in_time: string | null;
  check_out_date: string | null;
  check_out_time: string | null;
  confirmation_number: string | null;
  booking_reference: string | null;
  room_type: string | null;
  booked_under: string | null;
  address: string | null;
  phone: string | null;
  price: string | null;
}

// ── Prompts ────────────────────────────────────────────────────────────────────

const FLIGHT_SYSTEM_PROMPT = `You are a flight booking parser. Extract all flight details from this booking confirmation and return ONLY a JSON array (no markdown, no preamble). Each element represents one flight leg with these fields: passenger_name (the passenger's full name as printed, or null), flight_number, airline, departure_airport_code, departure_airport_name, departure_city, departure_date (YYYY-MM-DD), departure_time (HH:MM 24hr local), arrival_airport_code, arrival_airport_name, arrival_city, arrival_date (YYYY-MM-DD), arrival_time (HH:MM 24hr local), booking_reference, seat (or null), terminal_departure (or null), terminal_arrival (or null). If any field cannot be determined, use null.`;

const HOTEL_SYSTEM_PROMPT = `You are a hotel booking parser. Extract all hotel details from this booking confirmation and return ONLY a JSON object (no markdown, no preamble) with these fields: hotel_name, city, country, check_in_date (YYYY-MM-DD), check_in_time (HH:MM or null), check_out_date (YYYY-MM-DD), check_out_time (HH:MM or null), confirmation_number (or null), booking_reference (or null), room_type (or null), booked_under (the name on the reservation, or null), address (or null), phone (or null), price (as a string including currency, or null). If any field cannot be determined, use null.`;

// ── Helpers ────────────────────────────────────────────────────────────────────

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

type SupportedMediaType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

function getMediaType(file: File): SupportedMediaType {
  if (file.type === 'application/pdf') return 'application/pdf';
  if (file.type === 'image/png') return 'image/png';
  if (file.type === 'image/webp') return 'image/webp';
  if (file.type === 'image/gif') return 'image/gif';
  return 'image/jpeg';
}

function buildContentBlock(base64: string, file: File) {
  const mediaType = getMediaType(file);
  if (mediaType === 'application/pdf') {
    return {
      type: 'document' as const,
      source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 },
    };
  }
  return {
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: mediaType as Exclude<SupportedMediaType, 'application/pdf'>, data: base64 },
  };
}

function stripMarkdown(s: string): string {
  return s.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
}

async function callClaude(systemPrompt: string, file: File, userText: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string;
  if (!apiKey) throw new Error('Anthropic API key not configured. Set VITE_ANTHROPIC_API_KEY.');

  const base64 = await fileToBase64(file);

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
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            buildContentBlock(base64, file),
            { type: 'text', text: userText },
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
  return data.content?.[0]?.text ?? '';
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Extract flight legs from a PDF or image booking confirmation. */
export async function extractFlightsFromFile(file: File): Promise<ExtractedFlight[]> {
  const content = await callClaude(
    FLIGHT_SYSTEM_PROMPT,
    file,
    'Extract all flight legs from this booking confirmation.',
  );
  try {
    const parsed = JSON.parse(stripMarkdown(content));
    if (!Array.isArray(parsed)) throw new Error('Expected array from Claude');
    return parsed as ExtractedFlight[];
  } catch {
    throw new Error(`Failed to parse Claude response: ${content.slice(0, 200)}`);
  }
}

/** Extract hotel details from a PDF or image booking confirmation. */
export async function extractHotelFromFile(file: File): Promise<ExtractedHotel> {
  const content = await callClaude(
    HOTEL_SYSTEM_PROMPT,
    file,
    'Extract all hotel details from this booking confirmation.',
  );
  try {
    const parsed = JSON.parse(stripMarkdown(content));
    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected object');
    return parsed as ExtractedHotel;
  } catch {
    throw new Error(`Failed to parse Claude hotel response: ${content.slice(0, 200)}`);
  }
}

/** @deprecated Use extractFlightsFromFile(file) instead. */
export async function extractFlightsFromPDF(pdfBase64: string): Promise<ExtractedFlight[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string;
  if (!apiKey) throw new Error('Anthropic API key not configured.');
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
      system: FLIGHT_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          { type: 'text', text: 'Extract all flight legs from this booking confirmation.' },
        ],
      }],
    }),
  });
  if (!response.ok) throw new Error(`Claude API error ${response.status}`);
  const data = await response.json();
  const content = data.content?.[0]?.text ?? '';
  try {
    const parsed = JSON.parse(stripMarkdown(content));
    if (!Array.isArray(parsed)) throw new Error('Expected array');
    return parsed as ExtractedFlight[];
  } catch {
    throw new Error(`Failed to parse Claude response: ${content.slice(0, 200)}`);
  }
}
