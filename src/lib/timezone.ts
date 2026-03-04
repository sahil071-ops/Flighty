import { getAirportTimezone } from '@/data/airportTimezones';

export { getAirportTimezone };

/**
 * Converts a local date+time string in a given IANA timezone to a UTC Date.
 * E.g. "2024-03-15", "14:30", "Asia/Kolkata" → Date representing 09:00 UTC.
 */
export function localToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  const localStr = `${dateStr}T${timeStr}:00`;
  // Parse as if UTC
  const asUTC = new Date(localStr + 'Z');

  // Find what the local time actually is in the target timezone at asUTC
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

  const parts = formatter.formatToParts(asUTC);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  let hour = get('hour');
  if (hour === '24') hour = '00';

  const tzLocalStr = `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}Z`;
  const tzLocal = new Date(tzLocalStr);

  // actual_utc = 2 * asUTC - tzLocal
  return new Date(2 * asUTC.getTime() - tzLocal.getTime());
}

/**
 * Formats a UTC datetime string for display in a given IANA timezone.
 */
export function formatLocalTime(utcString: string, timezone: string): string {
  const date = new Date(utcString);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatLocalDate(utcString: string, timezone: string): string {
  const date = new Date(utcString);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatLocalDateShort(utcString: string, timezone: string): string {
  const date = new Date(utcString);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/** Returns e.g. "Mon · 15 Jan" — used on flight cards for prominent date display */
export function formatLocalDateCard(utcString: string, timezone: string): string {
  const date = new Date(utcString);
  const wd = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, weekday: 'short' }).format(date);
  const dm = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, day: 'numeric', month: 'short' }).format(date);
  return `${wd} · ${dm}`;
}

export function getTimezoneAbbr(utcString: string, timezone: string): string {
  const date = new Date(utcString);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(date);
  return parts.find(p => p.type === 'timeZoneName')?.value ?? timezone;
}

/**
 * Returns the local date and time strings for a UTC datetime in a given timezone.
 */
export function utcToLocal(utcString: string, timezone: string): { date: string; time: string } {
  const date = new Date(utcString);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  let hour = get('hour');
  if (hour === '24') hour = '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${hour}:${get('minute')}`,
  };
}

export function getDurationString(departureUtc: string, arrivalUtc: string): string {
  const dep = new Date(departureUtc).getTime();
  const arr = new Date(arrivalUtc).getTime();
  const diffMs = arr - dep;
  if (diffMs < 0) return '';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
