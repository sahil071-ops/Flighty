import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate('/');
    }
  }

  const inputClass =
    'bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-full';

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
          <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-sky-400 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
