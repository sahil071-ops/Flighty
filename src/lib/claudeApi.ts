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

/** Convert HEIC/HEIF to JPEG. Returns the original file for all other types. */
async function normalizeFile(file: File): Promise<File> {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name);
  if (!isHeic) return file;
  try {
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(result) ? result[0] : result;
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch (err) {
    throw new Error(`Could not convert HEIC image: ${err instanceof Error ? err.message : String(err)}`);
  }
}

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

  const normalizedFile = await normalizeFile(file);
  const base64 = await fileToBase64(normalizedFile);

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
            buildContentBlock(base64, normalizedFile),
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

// ── Document extraction types ──────────────────────────────────────────────────

export interface ExtractedPassport {
  passport_number: string | null;
  passport_country_of_issue: string | null;
  passport_nationality: string | null;
  passport_expiry_date: string | null; // YYYY-MM-DD
  passport_dob: string | null;
  full_name: string | null;
}

export interface ExtractedVisa {
  visa_country: string | null;
  visa_type: string | null;
  visa_entry_type: string | null;
  visa_issue_date: string | null;
  visa_expiry_date: string | null;
  visa_duration_of_stay: string | null;
  visa_issuing_country: string | null;
  visa_number: string | null;
}

export interface ExtractedInsurance {
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_start_date: string | null;
  insurance_end_date: string | null;
  insurance_coverage: string | null;
  insurance_emergency_number: string | null;
  insured_name: string | null;
}

export interface ExtractedOtherDoc {
  label: string | null;
  expiry_date: string | null;
  notes: string | null;
}

const PASSPORT_SYSTEM_PROMPT = `You are a passport document parser. Extract all details from this passport image or scan and return ONLY a JSON object (no markdown, no preamble) with these fields: passport_number, passport_country_of_issue, passport_nationality, passport_expiry_date (YYYY-MM-DD), passport_dob (YYYY-MM-DD), full_name. If any field cannot be determined, use null.`;

const VISA_SYSTEM_PROMPT = `You are a visa document parser. Extract all details from this visa stamp, sticker, or confirmation document and return ONLY a JSON object (no markdown, no preamble) with these fields: visa_country (country the visa grants entry to), visa_type (Tourist/Business/Transit/etc), visa_entry_type (Single/Multiple/Transit), visa_issue_date (YYYY-MM-DD), visa_expiry_date (YYYY-MM-DD), visa_duration_of_stay (e.g. "30 days per entry"), visa_issuing_country, visa_number (if visible). If any field cannot be determined, use null.`;

const INSURANCE_SYSTEM_PROMPT = `You are a travel insurance document parser. Extract all details from this insurance certificate or policy document and return ONLY a JSON object (no markdown, no preamble) with these fields: insurance_provider, insurance_policy_number, insurance_start_date (YYYY-MM-DD), insurance_end_date (YYYY-MM-DD), insurance_coverage (coverage territory description), insurance_emergency_number, insured_name. If any field cannot be determined, use null.`;

const OTHER_DOC_SYSTEM_PROMPT = `You are a travel document parser. Extract any relevant details from this document and return ONLY a JSON object (no markdown, no preamble) with these fields: label (a short descriptive name for this document), expiry_date (YYYY-MM-DD if any expiry is visible, otherwise null), notes (any other important details in 1-2 sentences). If any field cannot be determined, use null.`;

async function callClaudeForDoc<T>(systemPrompt: string, file: File, userText: string): Promise<T> {
  const content = await callClaude(systemPrompt, file, userText);
  try {
    const parsed = JSON.parse(stripMarkdown(content));
    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected object');
    return parsed as T;
  } catch {
    throw new Error(`Failed to parse Claude document response: ${content.slice(0, 200)}`);
  }
}

export async function extractPassportFromFile(file: File): Promise<ExtractedPassport> {
  return callClaudeForDoc<ExtractedPassport>(PASSPORT_SYSTEM_PROMPT, file, 'Extract all passport details from this document.');
}

export async function extractVisaFromFile(file: File): Promise<ExtractedVisa> {
  return callClaudeForDoc<ExtractedVisa>(VISA_SYSTEM_PROMPT, file, 'Extract all visa details from this document.');
}

export async function extractInsuranceFromFile(file: File): Promise<ExtractedInsurance> {
  return callClaudeForDoc<ExtractedInsurance>(INSURANCE_SYSTEM_PROMPT, file, 'Extract all insurance details from this document.');
}

export async function extractOtherDocFromFile(file: File): Promise<ExtractedOtherDoc> {
  return callClaudeForDoc<ExtractedOtherDoc>(OTHER_DOC_SYSTEM_PROMPT, file, 'Extract any relevant details from this document.');
}

// ── Car rental extraction ──────────────────────────────────────────────────────

export interface ExtractedCarRental {
  company: string | null;
  car_type: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
  dropoff_date: string | null;
  dropoff_time: string | null;
  confirmation_number: string | null;
  booking_reference: string | null;
  driver_name: string | null;
  price: string | null;
}

const CAR_RENTAL_SYSTEM_PROMPT = `You are a car rental booking parser. Extract all details from this rental confirmation and return ONLY a JSON object (no markdown, no preamble) with these fields: company (rental company name e.g. Hertz, Avis, Enterprise, Budget), car_type (e.g. Economy, SUV, Compact, Full-Size), pickup_location (full location name or address), dropoff_location (if different from pickup otherwise null), pickup_date (YYYY-MM-DD), pickup_time (HH:MM or null), dropoff_date (YYYY-MM-DD), dropoff_time (HH:MM or null), confirmation_number (or null), booking_reference (or null), driver_name (main driver full name or null), price (total price as string including currency or null). If any field cannot be determined use null.`;

export async function extractCarRentalFromFile(file: File): Promise<ExtractedCarRental> {
  return callClaudeForDoc<ExtractedCarRental>(CAR_RENTAL_SYSTEM_PROMPT, file, 'Extract all car rental details from this booking confirmation.');
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
