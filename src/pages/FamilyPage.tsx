import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { getCachedProfiles } from '@/lib/db';
import { Layout } from '@/components/layout/Layout';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Profile } from '@/types';

export function FamilyPage() {
  const { profile } = useAuth();
  const { isOnline } = useOffline();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.group_id) return;
    loadMembers();
  }, [profile?.group_id, isOnline]);

  async function loadMembers() {
    try {
      if (isOnline) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('group_id', profile!.group_id);
        setMembers(data ?? []);
      } else {
        const cached = await getCachedProfiles();
        setMembers(cached.filter(p => p.group_id === profile!.group_id));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Family">
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {members.map(member => (
              <Link
                key={member.id}
                to={`/family/${member.id}`}
                className="flex items-center gap-4 bg-slate-800 rounded-xl p-4 hover:bg-slate-750 active:scale-[0.99] transition-all"
              >
                <Avatar name={member.display_name} colour={member.avatar_colour} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white">{member.display_name}</div>
                  {member.is_admin && (
                    <div className="text-xs text-slate-500 mt-0.5">Admin</div>
                  )}
                  {member.id === profile?.id && (
                    <div className="text-xs text-sky-400 mt-0.5">You</div>
                  )}
                </div>
                <svg className="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
