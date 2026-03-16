/**
 * Web Push Notifications
 * - Device-member association stored in localStorage
 * - Subscription stored in Supabase push_subscriptions table
 */
import { supabase } from './supabase';

const DEVICE_MEMBER_KEY = 'familyflights_device_member';

export function getDeviceMemberId(): string | null {
  return localStorage.getItem(DEVICE_MEMBER_KEY);
}

export function setDeviceMemberId(memberId: string): void {
  localStorage.setItem(DEVICE_MEMBER_KEY, memberId);
}

export function clearDeviceMemberId(): void {
  localStorage.removeItem(DEVICE_MEMBER_KEY);
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!('Notification' in window)) return null;
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

export async function subscribeToPush(memberId: string): Promise<boolean> {
  try {
    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
    if (!publicKey) throw new Error('VAPID public key not configured');

    const registration = await navigator.serviceWorker.ready;

    // Cast to satisfy strict DOM types
    const keyArray = urlBase64ToUint8Array(publicKey) as unknown as Uint8Array<ArrayBuffer>;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyArray,
    });

    const { error } = await supabase.from('push_subscriptions').insert({
      family_member_id: memberId,
      subscription: subscription.toJSON(),
    });

    return !error;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      // Remove from Supabase
      const subJson = sub.toJSON();
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('subscription->>endpoint', subJson.endpoint);
      await sub.unsubscribe();
    }
  } catch {
    // Non-critical
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
