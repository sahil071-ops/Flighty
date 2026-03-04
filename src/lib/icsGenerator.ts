import type { Flight } from '@/types';
import { formatLocalTime, formatLocalDate, getTimezoneAbbr } from './timezone';

function formatICSDate(utcString: string, timezone: string): string {
  const date = new Date(utcString);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  let hour = get('hour');
  if (hour === '24') hour = '00';
  return `${get('year')}${get('month')}${get('day')}T${hour}${get('minute')}${get('second')}`;
}

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  parts.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) {
    parts.push(' ' + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join('\r\n');
}

export function generateICS(flight: Flight, memberName: string): string {
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const uid = `${flight.id}@familyflights`;

  const depLocal = formatICSDate(flight.departure_datetime_utc, flight.departure_timezone);
  const arrLocal = formatICSDate(flight.arrival_datetime_utc, flight.arrival_timezone);

  const depTime = formatLocalTime(flight.departure_datetime_utc, flight.departure_timezone);
  const arrTime = formatLocalTime(flight.arrival_datetime_utc, flight.arrival_timezone);
  const depAbbr = getTimezoneAbbr(flight.departure_datetime_utc, flight.departure_timezone);
  const arrAbbr = getTimezoneAbbr(flight.arrival_datetime_utc, flight.arrival_timezone);
  const depDate = formatLocalDate(flight.departure_datetime_utc, flight.departure_timezone);

  const summary = `${flight.flight_number}: ${flight.departure_airport_code} → ${flight.arrival_airport_code}`;

  const descLines = [
    `Flight: ${flight.flight_number}${flight.airline ? ` (${flight.airline})` : ''}`,
    `Route: ${flight.departure_city ?? flight.departure_airport_code} → ${flight.arrival_city ?? flight.arrival_airport_code}`,
    `Departure: ${depTime} ${depAbbr} on ${depDate}`,
    `Arrival: ${arrTime} ${arrAbbr}`,
    flight.booking_reference ? `Booking Ref: ${flight.booking_reference}` : null,
    flight.seat ? `Seat: ${flight.seat}` : null,
    flight.terminal_departure ? `Departure Terminal: ${flight.terminal_departure}` : null,
    flight.gate ? `Gate: ${flight.gate}` : null,
    `Passenger: ${memberName}`,
    // notes are now trip-level, not flight-level
  ]
    .filter(Boolean)
    .join('\\n');

  const location = [
    flight.departure_airport_name ?? flight.departure_airport_code,
    flight.departure_city,
  ]
    .filter(Boolean)
    .join(', ');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FamilyFlights//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${flight.departure_timezone}:${depLocal}`,
    `DTEND;TZID=${flight.arrival_timezone}:${arrLocal}`,
    foldLine(`SUMMARY:${escapeICS(summary)}`),
    foldLine(`DESCRIPTION:${escapeICS(descLines)}`),
    foldLine(`LOCATION:${escapeICS(location)}`),
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

export function downloadICS(flight: Flight, memberName: string): void {
  const icsContent = generateICS(flight, memberName);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = `${flight.flight_number}-${flight.departure_airport_code}-${flight.arrival_airport_code}.ics`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
