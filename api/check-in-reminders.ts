/**
 * Vercel cron job: check for flights departing in ~24h or ~48h
 * and send push notifications to the relevant family member's devices.
 * Runs every hour via vercel.json cron config.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow cron calls (Vercel sets this header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL ?? 'mailto:admin@familyflights.app';

  if (!vapidPublic || !vapidPrivate) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();

  // Check windows: 48h ±30min and 24h ±30min
  const windows = [
    { hours: 48, label: '2 days' },
    { hours: 24, label: 'tomorrow' },
  ];

  let totalSent = 0;

  for (const window of windows) {
    const windowStart = new Date(now.getTime() + (window.hours * 60 - 30) * 60000).toISOString();
    const windowEnd = new Date(now.getTime() + (window.hours * 60 + 30) * 60000).toISOString();

    const { data: flights } = await supabase
      .from('flights')
      .select('id, flight_number, family_member_id, departure_datetime_utc, departure_airport_code, arrival_airport_code, arrival_city')
      .gte('departure_datetime_utc', windowStart)
      .lte('departure_datetime_utc', windowEnd);

    for (const flight of flights ?? []) {
      // Get subscriptions for this member
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('family_member_id', flight.family_member_id);

      if (!subs?.length) continue;

      const dest = flight.arrival_city ?? flight.arrival_airport_code;
      const depTime = new Date(flight.departure_datetime_utc).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit',
      });

      const title = window.hours === 24
        ? `✈ Time to check in! ${flight.flight_number} to ${dest}`
        : `Check-in opens soon for ${flight.flight_number} to ${dest}`;
      const body = window.hours === 24
        ? `Departs ${window.label} at ${depTime}`
        : `Flight departs in ${window.label}`;

      const payload = JSON.stringify({
        title,
        body,
        url: `/flights/${flight.id}`,
        icon: '/icons/icon-192.png',
      });

      for (const { subscription } of subs) {
        try {
          await webpush.sendNotification(subscription as webpush.PushSubscription, payload);
          totalSent++;
        } catch {
          // Subscription may be expired — could delete it here
        }
      }
    }
  }

  return res.status(200).json({ sent: totalSent });
}
