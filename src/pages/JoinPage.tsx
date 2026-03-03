import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * /join?token=xxx
 * If user is logged in without a group, process invite.
 * If not logged in, redirect to signup with token.
 */
export function JoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const token = searchParams.get('token');

  useEffect(() => {
    if (loading) return;
    if (!token) {
      navigate('/');
      return;
    }
    if (!user) {
      navigate(`/signup?token=${token}`);
      return;
    }
    if (profile?.group_id) {
      // Already in a group
      navigate('/');
      return;
    }
    // Logged in but no group — redirect to signup with token to complete profile
    navigate(`/signup?token=${token}`);
  }, [loading, user, profile, token, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-slate-400">Redirecting…</p>
    </div>
  );
}
