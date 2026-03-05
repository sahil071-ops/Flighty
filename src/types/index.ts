// ── Top-level entity ───────────────────────────────────────────────────────────

export interface Trip {
  id: string;
  name: string;
  family_member_ids: string[]; // text slugs e.g. ['sahil', 'manmayee']
  start_date: string;          // YYYY-MM-DD
  end_date: string | null;     // YYYY-MM-DD
  notes: string | null;
  notes_last_edited_by: string | null;
  notes_last_edited_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Child entities ─────────────────────────────────────────────────────────────

export interface Flight {
  id: string;
  trip_id: string;             // FK → trips(id)
  family_member_id: string;    // text slug
  leg_order: number;
  flight_number: string;
  airline: string | null;
  departure_airport_code: string;
  departure_airport_name: string | null;
  departure_city: string | null;
  departure_datetime_utc: string;
  departure_timezone: string;
  arrival_airport_code: string;
  arrival_airport_name: string | null;
  arrival_city: string | null;
  arrival_datetime_utc: string;
  arrival_timezone: string;
  terminal_departure: string | null;
  terminal_arrival: string | null;
  gate: string | null;
  seat: string | null;
  booking_reference: string | null;
  price: string | null;
  ticket_pdf_url: string | null;
  created_at: string;
}

export interface Hotel {
  id: string;
  trip_id: string;
  family_member_id: string;
  hotel_name: string;
  city: string | null;
  country: string | null;
  check_in_date: string;       // YYYY-MM-DD
  check_in_time: string | null; // HH:MM
  check_out_date: string;      // YYYY-MM-DD
  check_out_time: string | null;
  confirmation_number: string | null;
  booking_reference: string | null;
  room_type: string | null;
  booked_under: string | null;
  address: string | null;
  phone: string | null;
  price: string | null;
  notes: string | null;
  voucher_url: string | null;
  created_at: string;
}

export interface TripDocument {
  id: string;
  trip_id: string;
  family_member_id: string | null; // null = applies to all members
  document_type: string; // 'Visa' | 'Travel Insurance' | 'Other'
  label: string;
  file_url: string;
  file_type: string | null; // 'pdf' | 'image'
  notes: string | null;
  created_at: string;
}

// ── Form data types ────────────────────────────────────────────────────────────

export interface FlightFormData {
  family_member_id: string;
  leg_order?: number;
  flight_number: string;
  airline?: string;
  departure_airport_code: string;
  departure_airport_name?: string;
  departure_city?: string;
  departure_date: string; // YYYY-MM-DD local
  departure_time: string; // HH:MM local
  arrival_airport_code: string;
  arrival_airport_name?: string;
  arrival_city?: string;
  arrival_date: string;   // YYYY-MM-DD local
  arrival_time: string;   // HH:MM local
  terminal_departure?: string;
  terminal_arrival?: string;
  gate?: string;
  seat?: string;
  booking_reference?: string;
  price?: string;
}

export interface HotelFormData {
  family_member_id: string;
  hotel_name: string;
  city?: string;
  country?: string;
  check_in_date: string;  // YYYY-MM-DD
  check_in_time?: string; // HH:MM
  check_out_date: string; // YYYY-MM-DD
  check_out_time?: string;
  confirmation_number?: string;
  booking_reference?: string;
  room_type?: string;
  booked_under?: string;
  address?: string;
  phone?: string;
  price?: string;
  notes?: string;
}

// ── Legacy colour palette (used by member picker) ─────────────────────────────

export const AVATAR_COLOURS = [
  { name: 'sky',     value: '#0ea5e9', bg: 'bg-sky-500',     border: 'border-sky-500' },
  { name: 'emerald', value: '#10b981', bg: 'bg-emerald-500', border: 'border-emerald-500' },
  { name: 'violet',  value: '#8b5cf6', bg: 'bg-violet-500',  border: 'border-violet-500' },
  { name: 'amber',   value: '#f59e0b', bg: 'bg-amber-500',   border: 'border-amber-500' },
  { name: 'pink',    value: '#ec4899', bg: 'bg-pink-500',    border: 'border-pink-500' },
  { name: 'red',     value: '#ef4444', bg: 'bg-red-500',     border: 'border-red-500' },
  { name: 'cyan',    value: '#06b6d4', bg: 'bg-cyan-500',    border: 'border-cyan-500' },
  { name: 'lime',    value: '#84cc16', bg: 'bg-lime-500',    border: 'border-lime-500' },
  { name: 'rose',    value: '#f43f5e', bg: 'bg-rose-500',    border: 'border-rose-500' },
  { name: 'indigo',  value: '#6366f1', bg: 'bg-indigo-500',  border: 'border-indigo-500' },
] as const;

export type AvatarColour = typeof AVATAR_COLOURS[number]['value'];
