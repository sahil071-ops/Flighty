import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, FAMILY_MEMBERS } from '@/context/AppContext';
import { Avatar } from '@/components/ui/Avatar';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ThisWeekBanner } from '@/components/trips/ThisWeekBanner';

type Tab = 'members' | 'calendar';

export function HomePage() {
  const { setCurrentMember, lock } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('members');

  function selectMember(member: typeof FAMILY_MEMBERS[0]) {
    setCurrentMember(member);
    navigate(`/member/${member.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <h1 className="text-lg font-semibold text-white">FamilyFlights</h1>
          </div>
          <button
            onClick={() => lock()}
            className="text-slate-500 hover:text-slate-300 transition-colors p-2 -mr-2"
            aria-label="Lock app"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setTab('members')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              tab === 'members'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setTab('calendar')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              tab === 'calendar'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Calendar
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        {tab === 'members' && (
          <div className="flex flex-col gap-5">
            <ThisWeekBanner />
            <div>
              <p className="text-sm text-slate-400 mb-5 text-center">Who are you?</p>
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                {FAMILY_MEMBERS.map(member => (
                  <button
                    key={member.id}
                    onClick={() => selectMember(member)}
                    className="flex flex-col items-center gap-3 bg-slate-800 rounded-2xl p-5 active:scale-95 transition-all border border-slate-700 hover:border-slate-500"
                  >
                    <Avatar name={member.name} colour={member.colour} size="lg" />
                    <span className="text-sm font-medium text-white">{member.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'calendar' && <CalendarView />}
      </main>
    </div>
  );
}
