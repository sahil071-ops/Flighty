import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { clearAllCache } from '@/lib/db';
import { Layout } from '@/components/layout/Layout';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { AVATAR_COLOURS } from '@/types';

export function ProfilePage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const { isOnline } = useOffline();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [avatarColour, setAvatarColour] = useState(profile?.avatar_colour ?? AVATAR_COLOURS[0].value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  const inputClass =
    'bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-full';

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), avatar_colour: avatarColour })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function handleSignOut() {
    await clearAllCache();
    await signOut();
    navigate('/login');
  }

  async function loadAdmin() {
    if (!profile?.group_id || !profile.is_admin) return;
    setLoadingAdmin(true);
    const [groupRes, membersRes] = await Promise.all([
      supabase.from('family_groups').select('invite_token').eq('id', profile.group_id).maybeSingle(),
      supabase.from('profiles').select('*').eq('group_id', profile.group_id),
    ]);
    if (groupRes.data?.invite_token) {
      setInviteLink(`${window.location.origin}/join?token=${groupRes.data.invite_token}`);
    }
    setMembers(membersRes.data ?? []);
    setLoadingAdmin(false);
    setShowAdmin(true);
  }

  async function handleRegenerateInvite() {
    if (!profile?.group_id) return;
    const newToken = crypto.randomUUID();
    const { error } = await supabase
      .from('family_groups')
      .update({ invite_token: newToken })
      .eq('id', profile.group_id);
    if (!error) {
      setInviteLink(`${window.location.origin}/join?token=${newToken}`);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (memberId === profile?.id) return;
    if (!confirm('Remove this member from the family group?')) return;
    await supabase.from('profiles').update({ group_id: null }).eq('id', memberId);
    setMembers(m => m.filter(x => x.id !== memberId));
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
  }

  return (
    <Layout title="Profile & Settings">
      <div className="px-4 py-4 pb-8 flex flex-col gap-5">
        {/* Avatar preview */}
        <div className="flex items-center gap-4 bg-slate-800 rounded-xl p-4">
          <Avatar name={displayName || 'You'} colour={avatarColour} size="lg" />
          <div>
            <div className="font-semibold text-white">{profile?.display_name}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {profile?.is_admin ? 'Group Admin' : 'Member'}
            </div>
          </div>
        </div>

        {/* Edit profile form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Display name</label>
            <input
              type="text"
              className={inputClass}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              disabled={!isOnline}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Avatar colour</label>
            <div className="flex flex-wrap gap-3">
              {AVATAR_COLOURS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAvatarColour(c.value)}
                  className={`w-9 h-9 rounded-full transition-all ${
                    avatarColour === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.name}
                  disabled={!isOnline}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" loading={saving} disabled={!isOnline} className="w-full">
            {saved ? '✓ Saved!' : 'Save changes'}
          </Button>
        </form>

        {/* Admin panel */}
        {profile?.is_admin && (
          <div className="border border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={showAdmin ? () => setShowAdmin(false) : loadAdmin}
              className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-slate-800/50 transition-colors"
            >
              <span className="font-medium text-white">Manage Family</span>
              <svg className={`w-5 h-5 text-slate-400 transition-transform ${showAdmin ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAdmin && (
              <div className="border-t border-slate-700 px-4 py-4 flex flex-col gap-4">
                {/* Invite link */}
                {inviteLink && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-400">Family invite link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteLink}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 flex-1 min-w-0"
                      />
                      <button
                        onClick={copyInviteLink}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-xs transition-colors flex-shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                    <button
                      onClick={handleRegenerateInvite}
                      className="text-xs text-slate-500 hover:text-slate-400 text-left transition-colors"
                    >
                      Regenerate invite link (invalidates current link)
                    </button>
                  </div>
                )}

                {/* Members list */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-slate-400">Members ({members.length})</label>
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 bg-slate-800 rounded-lg px-3 py-2.5">
                      <Avatar name={m.display_name} colour={m.avatar_colour} size="sm" />
                      <span className="text-sm text-white flex-1">{m.display_name}</span>
                      {m.is_admin && <span className="text-xs text-slate-500">Admin</span>}
                      {m.id !== profile?.id && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="text-red-400 hover:text-red-300 text-xs transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sign out */}
        <div className="border-t border-slate-800 pt-4">
          <Button variant="danger" className="w-full" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </Layout>
  );
}
