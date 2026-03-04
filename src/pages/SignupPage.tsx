import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { AVATAR_COLOURS } from '@/types';

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');

  const [step, setStep] = useState<'account' | 'profile' | 'confirm'>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarColour, setAvatarColour] = useState<string>(AVATAR_COLOURS[0].value);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    'bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-full';

  async function handleAccountStep(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setStep('profile');
  }

  async function handleProfileStep(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!inviteToken && !groupName.trim()) {
      setError('Please enter a family group name.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');

      // If Supabase email confirmation is enabled the session will be null here.
      // We can't make authenticated DB calls without a session, so store the
      // pending invite token (if any) and ask the user to confirm their email.
      // The OnboardingPage will pick up the token after confirmation.
      if (!authData.session) {
        if (inviteToken) {
          localStorage.setItem('pending_invite_token', inviteToken);
        }
        // Store profile prefs so OnboardingPage can pre-fill them
        localStorage.setItem('pending_display_name', displayName.trim());
        localStorage.setItem('pending_avatar_colour', avatarColour);
        if (groupName.trim()) {
          localStorage.setItem('pending_group_name', groupName.trim());
        }
        setStep('confirm');
        return;
      }

      const userId = authData.user.id;

      let groupId: string;
      let isAdmin = false;

      if (inviteToken) {
        // Joining an existing group
        const { data: group, error: groupError } = await supabase
          .from('family_groups')
          .select('id')
          .eq('invite_token', inviteToken)
          .maybeSingle();
        if (groupError || !group) throw new Error('Invalid or expired invite link.');
        groupId = group.id;
      } else {
        // Creating a new group
        const { data: group, error: groupError } = await supabase
          .from('family_groups')
          .insert({ name: groupName.trim() })
          .select()
          .single();
        if (groupError || !group) throw groupError ?? new Error('Failed to create family group');
        groupId = group.id;
        isAdmin = true;
      }

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        display_name: displayName.trim(),
        avatar_colour: avatarColour,
        group_id: groupId,
        is_admin: isAdmin,
      });
      if (profileError) throw profileError;

      navigate('/');
    } catch (err) {
      // Supabase PostgrestError is not an instanceof Error — extract .message directly
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
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-sky-500/10 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-9 h-9 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">FamilyFlights</h1>
          <p className="text-slate-400 text-sm mt-1">
            {inviteToken ? 'Join your family group' : 'Create your family group'}
          </p>
        </div>

        {step === 'confirm' ? (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center text-3xl">
              📧
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
                Tap the link in the email to activate your account — your family group will be set up automatically once you confirm.
              </p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-left w-full">
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="text-slate-300 font-medium">Tip:</span> If you don't see the email, check your spam folder. After confirming, you can sign in on the login screen.
              </p>
            </div>
            <Link to="/login" className="text-sky-400 text-sm font-medium mt-2">
              Already confirmed? Sign in
            </Link>
          </div>
        ) : step === 'account' ? (
          <form onSubmit={handleAccountStep} className="flex flex-col gap-4">
            <input
              type="email"
              className={inputClass}
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="password"
              className={inputClass}
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full mt-2" size="lg">
              Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={handleProfileStep} className="flex flex-col gap-5">
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

            {/* Avatar colour picker */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">Choose your colour</label>
              <div className="flex flex-wrap gap-3">
                {AVATAR_COLOURS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setAvatarColour(c.value)}
                    className={`w-10 h-10 rounded-full transition-all ${
                      avatarColour === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                    }`}
                    style={{ backgroundColor: c.value }}
                    aria-label={c.name}
                  />
                ))}
              </div>
              {displayName && (
                <div className="flex items-center gap-3 mt-2">
                  <Avatar name={displayName} colour={avatarColour} size="lg" />
                  <span className="text-slate-300 text-sm">{displayName}</span>
                </div>
              )}
            </div>

            {!inviteToken && (
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

            {inviteToken && (
              <div className="bg-sky-900/30 border border-sky-700 rounded-lg px-4 py-3 text-sm text-sky-300">
                You're joining via an invite link. You'll be added to the family group automatically.
              </div>
            )}

            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setStep('account'); setError(null); }}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" loading={loading} className="flex-1" size="lg">
                Create account
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-sky-400 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
