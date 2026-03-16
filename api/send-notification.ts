/**
 * Vercel serverless function: send a web push notification.
 * POST body: { memberId, title, body, url }
 * Used by the cron job to send check-in reminders.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

  const { memberId, title, body, url } = req.body as {
    memberId: string;
    title: string;
    body: string;
    url?: string;
  };

  if (!memberId || !title || !body) {
    return res.status(400).json({ error: 'memberId, title, and body are required' });
  }

  // Fetch all subscriptions for this member
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('family_member_id', memberId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const payload = JSON.stringify({
    title,
    body,
    url: url ?? '/',
    icon: '/icons/icon-192.png',
  });

  const results = await Promise.allSettled(
    (subs ?? []).map(({ subscription }) =>
      webpush.sendNotification(subscription as webpush.PushSubscription, payload)
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return res.status(200).json({ sent, failed });
}
