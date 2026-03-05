import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { SyncIndicator } from '@/components/ui/SyncIndicator';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  headerRight?: ReactNode;
  hideNav?: boolean;
}

export function Layout({ children, title, headerRight, hideNav = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <OfflineBanner />
      {title && (
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="text-lg font-semibold text-white">{title}</h1>
            {headerRight && <div>{headerRight}</div>}
          </div>
        </header>
      )}
      <main className={`flex-1 overflow-y-auto ${hideNav ? '' : 'pb-20'}`}>
        {children}
      </main>
      <SyncIndicator />
      {!hideNav && <BottomNav />}
    </div>
  );
}
