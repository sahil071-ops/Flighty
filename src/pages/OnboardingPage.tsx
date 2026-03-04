import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { AVATAR_COLOURS } from '@/types';

/**
 * Shown when a user is logged in but has no profile yet.
 * This happens when:
 *   a) A user confirmed their email (session restored, no profile exists yet)
 *   b) Any other edge case where profile creation was deferred
 *
 * Checks localStorage for a pending invite token (stored by SignupPage when
 * email confirmation was required) so invite-link joiners are routed correctly.
 */
export function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Pre-fill from values stashed by SignupPage before email confirmation
  const pendingToken = localStorage.getItem('pending_invite_token');
  const pendingName = localStorage.getItem('pending_display_name') ?? '';
  const pendingColour = localStorage.getItem('pending_avatar_colour') ?? AVATAR_COLOURS[0].value;
  const pendingGroup = localStorage.getItem('pending_group_name') ?? '';

  const [displayName, setDisplayName] = useState(pendingName);
  const [avatarColour, setAvatarColour] = useState(pendingColour);
  const [groupName, setGroupName] = useState(pendingGroup);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joiningViaInvite = !!pendingToken;

  const inputClass =
    'bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-full';

  function clearPendingStorage() {
    localStorage.removeItem('pending_invite_token');
    localStorage.removeItem('pending_display_name');
    localStorage.removeItem('pending_avatar_colour');
    localStorage.removeItem('pending_group_name');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let groupId: string;
      let isAdmin = false;

      if (pendingToken) {
        // User joined via an invite link — find and join the existing group
        const { data: group, error: groupError } = await supabase
          .from('family_groups')
          .select('id')
          .eq('invite_token', pendingToken)
          .maybeSingle();
        if (groupError || !group) throw new Error('Invite link is invalid or has expired. Ask the admin to share a new one.');
        groupId = group.id;
      } else {
        // First user — create a new family group
        const { data: group, error: groupError } = await supabase
          .from('family_groups')
          .insert({ name: groupName.trim() })
          .select()
          .single();
        if (groupError || !group) {
          const msg = (groupError as { message?: string })?.message ?? 'Failed to create group';
          throw new Error(msg);
        }
        groupId = group.id;
        isAdmin = true;
      }

      // Create the user's profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        display_name: displayName.trim(),
        avatar_colour: avatarColour,
        group_id: groupId,
        is_admin: isAdmin,
      });
      if (profileError) {
        const msg = (profileError as { message?: string })?.message ?? 'Failed to create profile';
        throw new Error(msg);
      }

      clearPendingStorage();
      await refreshProfile();
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-sky-500/10 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-9 h-9 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Almost there!</h1>
          <p className="text-slate-400 text-sm mt-1">
            {joiningViaInvite ? 'Finish setting up your account' : 'Set up your family group'}
          </p>
        </div>

        {joiningViaInvite && (
          <div className="bg-sky-900/30 border border-sky-700 rounded-xl p-4 mb-5 text-sm text-sky-300">
            You're joining an existing family group via invite link.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Your name</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Priya"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Choose your colour</label>
            <div className="flex flex-wrap gap-3">
              {AVATAR_COLOURS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAvatarColour(c.value)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    avatarColour === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.name}
                />
              ))}
            </div>
            {displayName && (
              <div className="flex items-center gap-3 mt-1">
                <Avatar name={displayName} colour={avatarColour} size="md" />
                <span className="text-slate-300 text-sm">{displayName}</span>
              </div>
            )}
          </div>

          {!joiningViaInvite && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Family group name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. The Sharma Family"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                required
              />
            </div>
          )}

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Get started
          </Button>
        </form>
      </div>
    </div>
  );
}
