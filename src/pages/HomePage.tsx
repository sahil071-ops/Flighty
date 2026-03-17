import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, FAMILY_MEMBERS } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ThisWeekBanner } from '@/components/trips/ThisWeekBanner';
import { ExpiryWarningBanner } from '@/components/documents/ExpiryWarningBanner';
import { FlyingNowCard } from '@/components/home/FlyingNowCard';
import { BottomNav } from '@/components/layout/BottomNav';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import { VERSION } from '@/version';

type Tab = 'members' | 'calendar';

export function HomePage() {
  const { setCurrentMember, lock } = useApp();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('members');

  function selectMember(member: typeof FAMILY_MEMBERS[0]) {
    setCurrentMember(member);
    navigate(`/member/${member.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <OfflineBanner />

      {/* Header */}
      <header
        className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-white/[.06]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-400/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
            </div>
            <h1 className="text-[15px] font-semibold tracking-tight text-white">FamilyFlights</h1>
          </div>

          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="text-slate-600 hover:text-slate-300 transition-colors p-2"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                /* Sun icon */
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              ) : (
                /* Moon icon */
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
              )}
            </button>

            {/* Lock */}
            <button
              onClick={() => lock()}
              className="text-slate-600 hover:text-slate-300 transition-colors p-2 -mr-2"
              aria-label="Lock app"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex px-4 border-b border-white/[.06]">
          {(['members', 'calendar'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative py-2.5 px-1 mr-6 text-[13px] font-medium transition-colors ${
                tab === t ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-cyan-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 py-5" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        {tab === 'members' && (
          <div className="flex flex-col gap-5">
            <FlyingNowCard />
            <ThisWeekBanner />
            <ExpiryWarningBanner />

            {/* Member grid */}
            <div>
              <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 mb-4 text-center">
                Who are you?
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                {FAMILY_MEMBERS.map(member => (
                  <div key={member.id} className="relative">
                    <button
                      onClick={() => selectMember(member)}
                      className="w-full flex flex-col items-center gap-3 rounded-2xl p-5 active:scale-95 transition-all duration-150 border relative overflow-hidden"
                      style={{
                        backgroundColor: `${member.colour}0A`,
                        borderColor: `${member.colour}28`,
                      }}
                    >
                      {/* Top glow line */}
                      <div className="absolute top-0 left-0 right-0 h-px" style={{ backgroundColor: `${member.colour}50` }} />
                      <Avatar
                        name={member.name}
                        colour={member.colour}
                        size="xl"
                        memberId={member.id}
                        editable
                      />
                      <span className="text-[13px] font-semibold tracking-tight text-white">
                        {member.name}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-700 text-center mt-3">
                Tap your photo to change it
              </p>
            </div>

            <button onClick={() => navigate('/whats-new')} className="text-center mt-1">
              <span className="text-[11px] text-slate-700 hover:text-slate-500 transition-colors tracking-wide">
                v{VERSION}
              </span>
            </button>
          </div>
        )}

        {tab === 'calendar' && <CalendarView />}
      </main>

      <SyncIndicator />
      <BottomNav />
    </div>
  );
}
