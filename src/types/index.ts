// ── Member Documents ───────────────────────────────────────────────────────────

export type DocumentType = 'passport' | 'visa' | 'travel_insurance' | 'other';

export interface MemberDocument {
  id: string;
  family_member_id: string;        // text slug e.g. 'sahil'
  document_type: DocumentType;
  label: string;
  // Passport
  passport_number: string | null;
  passport_country_of_issue: string | null;
  passport_nationality: string | null;
  passport_expiry_date: string | null; // YYYY-MM-DD
  passport_dob: string | null;
  // Visa
  visa_country: string | null;
  visa_type: string | null;
  visa_entry_type: string | null;
  visa_issue_date: string | null;
  visa_expiry_date: string | null;
  visa_duration_of_stay: string | null;
  visa_issuing_country: string | null;
  visa_number: string | null;
  // Travel insurance
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_start_date: string | null;
  insurance_end_date: string | null;
  insurance_coverage: string | null;
  insurance_emergency_number: string | null;
  // Unified
  expiry_date: string | null;
  notes: string | null;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
  updated_at: string;
}

export type ExpiryStatus = 'ok' | 'soon' | 'urgent' | 'expired';

/** Returns expiry status for a document, or null if no expiry set. */
export function getExpiryStatus(expiryDate: string | null): ExpiryStatus | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate + 'T00:00:00');
  const days = Math.round((exp.getTime() - today.getTime()) / 86400000);
  if (days < 0) return 'expired';
  if (days <= 30) return 'urgent';
  if (days <= 90) return 'soon';
  return 'ok';
}

/** Days until expiry (negative if expired), or null if no expiry. */
export function daysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate + 'T00:00:00');
  return Math.round((exp.getTime() - today.getTime()) / 86400000);
}

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

// ── Car Rentals ────────────────────────────────────────────────────────────────

export interface CarRental {
  id: string;
  trip_id: string;
  family_member_id: string;
  company: string;
  car_type: string | null;
  pickup_location: string;
  dropoff_location: string | null;
  pickup_date: string;         // YYYY-MM-DD
  pickup_time: string | null;  // HH:MM
  dropoff_date: string;        // YYYY-MM-DD
  dropoff_time: string | null;
  confirmation_number: string | null;
  booking_reference: string | null;
  driver_name: string | null;
  price: string | null;
  notes: string | null;
  voucher_url: string | null;
  created_at: string;
}

export interface CarRentalFormData {
  family_member_id: string;
  company: string;
  car_type?: string;
  pickup_location: string;
  dropoff_location?: string;
  pickup_date: string;
  pickup_time?: string;
  dropoff_date: string;
  dropoff_time?: string;
  confirmation_number?: string;
  booking_reference?: string;
  driver_name?: string;
  price?: string;
  notes?: string;
}

// ── Boarding Passes ────────────────────────────────────────────────────────────

export interface BoardingPass {
  id: string;
  flight_id: string;
  trip_id: string;
  passenger_name: string | null;
  gate: string | null;
  seat: string | null;
  boarding_time: string | null;
  departure_time: string | null;
  departure_date: string | null;
  sequence_number: string | null;
  fare_class: string | null;
  has_qr_code: boolean;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
}

// ── Loyalty Cards ──────────────────────────────────────────────────────────────

export interface LoyaltyCard {
  id: string;
  family_member_id: string;
  airline_name: string;
  airline_iata_code: string | null;
  programme_name: string;
  member_number: string;
  tier: string | null;
  alliance: string | null;
  notes: string | null;
  created_at: string;
}

// ── Flight Status ──────────────────────────────────────────────────────────────

export type FlightStatusCode = 'scheduled' | 'active' | 'landed' | 'cancelled' | 'incident' | 'diverted';

export interface FlightStatus {
  flight_number: string;
  date: string; // YYYY-MM-DD
  status: FlightStatusCode;
  departure_scheduled: string | null;
  departure_actual: string | null;
  arrival_scheduled: string | null;
  arrival_actual: string | null;
  departure_gate: string | null;
  arrival_gate: string | null;
  departure_delay: number | null;
  arrival_delay: number | null;
  last_fetched: string; // ISO timestamp
}

// ── Flight Requests ────────────────────────────────────────────────────────────

/** One leg within a flight request option */
export interface FlightRequestLeg {
  flight_number: string | null;
  airline: string | null;
  airline_iata_code: string | null;
  departure_airport_code: string;
  departure_city: string | null;
  arrival_airport_code: string;
  arrival_city: string | null;
  departure_date: string;          // YYYY-MM-DD local
  departure_time: string;          // HH:MM local
  arrival_date: string;
  arrival_time: string;
  duration_minutes: number | null;
  layover_minutes_after: number | null; // wait before next leg; null on last leg
}

/** One flight option within a request (one row in flight_request_options) */
export interface FlightRequestOption {
  id: string;
  request_id: string;
  option_number: number;
  legs: FlightRequestLeg[];
  total_duration_minutes: number | null;
  stops: number;
  price: string | null;
  cabin_class: string | null;
  baggage_checked_included: boolean | null;
  baggage_checked_kg: number | null;
  baggage_cabin_included: boolean | null;
  notes: string | null;
  created_at: string;
}

/** Top-level flight request submitted by the assistant for Sahil's review */
export interface FlightRequest {
  id: string;
  label: string;
  trip_context: string | null;
  for_family_member_id: string;    // text slug, e.g. 'sahil'
  status: 'pending' | 'approved' | 'declined' | 'trip_created';
  approved_option_id: string | null;
  approver_comment: string | null;
  raw_input: string | null;
  created_at: string;
  updated_at: string;
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
