export interface FamilyGroup {
  id: string;
  name: string;
  invite_token: string;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_colour: string;
  group_id: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Flight {
  id: string;
  group_id: string;
  family_member_id: string;
  trip_id: string | null;
  trip_name: string | null;
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
  notes: string | null;
  ticket_pdf_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  profile?: Profile;
}

export interface FlightFormData {
  family_member_id: string;
  trip_id?: string;
  trip_name?: string;
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
  arrival_date: string; // YYYY-MM-DD local
  arrival_time: string; // HH:MM local
  terminal_departure?: string;
  terminal_arrival?: string;
  gate?: string;
  seat?: string;
  booking_reference?: string;
  price?: string;
  notes?: string;
}

export const AVATAR_COLOURS = [
  { name: 'sky', value: '#0ea5e9', bg: 'bg-sky-500', border: 'border-sky-500' },
  { name: 'emerald', value: '#10b981', bg: 'bg-emerald-500', border: 'border-emerald-500' },
  { name: 'violet', value: '#8b5cf6', bg: 'bg-violet-500', border: 'border-violet-500' },
  { name: 'amber', value: '#f59e0b', bg: 'bg-amber-500', border: 'border-amber-500' },
  { name: 'pink', value: '#ec4899', bg: 'bg-pink-500', border: 'border-pink-500' },
  { name: 'red', value: '#ef4444', bg: 'bg-red-500', border: 'border-red-500' },
  { name: 'cyan', value: '#06b6d4', bg: 'bg-cyan-500', border: 'border-cyan-500' },
  { name: 'lime', value: '#84cc16', bg: 'bg-lime-500', border: 'border-lime-500' },
  { name: 'rose', value: '#f43f5e', bg: 'bg-rose-500', border: 'border-rose-500' },
  { name: 'indigo', value: '#6366f1', bg: 'bg-indigo-500', border: 'border-indigo-500' },
] as const;

export type AvatarColour = typeof AVATAR_COLOURS[number]['value'];
