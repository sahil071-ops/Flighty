/**
 * Notification settings section — appears in the app (e.g. on MyFlightsPage or
 * after password unlock). Handles device-member association and push permission.
 */
import { useState, useEffect } from 'react';
import { FAMILY_MEMBERS } from '@/data/members';
import { Avatar } from '@/components/ui/Avatar';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  getDeviceMemberId,
  setDeviceMemberId,
} from '@/lib/pushNotifications';

export function NotificationSettings() {
  const [deviceMemberId, setDeviceMemberIdState] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  useEffect(() => {
    setDeviceMemberIdState(getDeviceMemberId());
    setPermission(getNotificationPermission());
  }, []);

  if (!isPushSupported()) return null;

  const deviceMember = FAMILY_MEMBERS.find(m => m.id === deviceMemberId);

  async function handleSelectMember(memberId: string) {
    setDeviceMemberId(memberId);
    setDeviceMemberIdState(memberId);
    setShowMemberPicker(false);
    setMessage(null);
  }

  async function handleEnableNotifications() {
    if (!deviceMemberId) {
      setMessage('Select which family member this device belongs to first.');
      setShowMemberPicker(true);
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm === 'granted') {
        const ok = await subscribeToPush(deviceMemberId);
        setMessage(ok ? 'Check-in reminders enabled!' : 'Subscribed locally but failed to save to server.');
      } else if (perm === 'denied') {
        setMessage('Notifications blocked. Enable in your browser/device settings.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Check-in Reminders</h3>

      {/* Device-member association */}
      <div className="mb-3">
        <p className="text-xs text-slate-500 mb-2">This device belongs to:</p>
        {deviceMember ? (
          <div className="flex items-center gap-3">
            <Avatar name={deviceMember.name} colour={deviceMember.colour} size="sm" />
            <span className="text-sm text-white">{deviceMember.name}</span>
            <button
              onClick={() => setShowMemberPicker(true)}
              className="text-xs text-sky-400 hover:text-sky-300 ml-auto"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowMemberPicker(true)}
            className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
          >
            Select family member →
          </button>
        )}
      </div>

      {showMemberPicker && (
        <div className="bg-slate-700 rounded-lg p-3 mb-3 flex flex-col gap-2">
          {FAMILY_MEMBERS.map(m => (
            <button
              key={m.id}
              onClick={() => handleSelectMember(m.id)}
              className="flex items-center gap-3 hover:bg-slate-600 rounded-lg p-2 transition-colors text-left"
            >
              <Avatar name={m.name} colour={m.colour} size="sm" />
              <span className="text-sm text-white">{m.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Notification toggle */}
      {permission === 'granted' ? (
        <div className="flex items-center gap-2 text-emerald-400 text-xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Check-in reminders enabled (48h and 24h before departure)
        </div>
      ) : permission === 'denied' ? (
        <p className="text-xs text-red-400">
          Notifications blocked. Enable in Settings → Browser → Notifications.
        </p>
      ) : (
        <button
          onClick={handleEnableNotifications}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          )}
          Enable check-in reminders
        </button>
      )}

      {message && <p className={`text-xs mt-2 ${message.includes('!') ? 'text-emerald-400' : 'text-amber-400'}`}>{message}</p>}
    </div>
  );
}
