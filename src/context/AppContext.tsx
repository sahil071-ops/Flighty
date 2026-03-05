import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { FAMILY_MEMBERS, getMember, type Member } from '@/data/members';
import { syncAllFiles, registerVisibilitySync } from '@/lib/backgroundSync';

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD as string | undefined ?? 'Axis@149';
const UNLOCK_KEY = 'ff_unlocked';
const MEMBER_KEY = 'ff_member';

interface AppContextValue {
  isUnlocked: boolean;
  unlock: (password: string) => Promise<boolean>;
  lock: () => Promise<void>;
  currentMember: Member | null;
  setCurrentMember: (member: Member | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(
    () => localStorage.getItem(UNLOCK_KEY) === 'true'
  );
  const [currentMember, setCurrentMemberState] = useState<Member | null>(() => {
    const id = localStorage.getItem(MEMBER_KEY);
    return id ? (getMember(id) ?? null) : null;
  });

  // On load: ensure anonymous session, then kick off background file sync.
  useEffect(() => {
    if (!isUnlocked) return;
    ensureAnonSession().then(() => syncAllFiles());
    return registerVisibilitySync();
  }, [isUnlocked]);

  async function ensureAnonSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await supabase.auth.signInAnonymously();
    }
  }

  async function unlock(password: string): Promise<boolean> {
    if (password !== APP_PASSWORD) return false;
    await supabase.auth.signInAnonymously();
    localStorage.setItem(UNLOCK_KEY, 'true');
    setIsUnlocked(true);
    return true;
  }

  async function lock() {
    await supabase.auth.signOut();
    localStorage.removeItem(UNLOCK_KEY);
    localStorage.removeItem(MEMBER_KEY);
    setIsUnlocked(false);
    setCurrentMemberState(null);
  }

  function setCurrentMember(member: Member | null) {
    if (member) {
      localStorage.setItem(MEMBER_KEY, member.id);
    } else {
      localStorage.removeItem(MEMBER_KEY);
    }
    setCurrentMemberState(member);
  }

  return (
    <AppContext.Provider value={{ isUnlocked, unlock, lock, currentMember, setCurrentMember }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// Re-export for convenience
export { FAMILY_MEMBERS };
