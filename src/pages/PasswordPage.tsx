import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';

export function PasswordPage() {
  const { unlock } = useApp();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const ok = await unlock(password);
    setLoading(false);
    if (!ok) {
      setError(true);
      setPassword('');
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 bg-sky-500/10 rounded-3xl flex items-center justify-center">
            <svg className="w-11 h-11 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">FamilyFlights</h1>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="password"
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white text-center text-lg tracking-widest placeholder-slate-600 focus:outline-none focus:border-sky-500 w-full"
            placeholder="••••••••"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false); }}
            autoFocus
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-red-400 text-center">Incorrect password</p>
          )}

          <Button type="submit" loading={loading} size="lg" className="w-full">
            Enter
          </Button>
        </form>
      </div>
    </div>
  );
}
