'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthOrOnboarding = pathname === '/' || pathname === '/auth' || pathname === '/onboarding';

  if (isAuthOrOnboarding) {
    return <main className="min-h-dvh bg-[var(--bg-primary)]">{children}</main>;
  }

  return (
    <div className="min-h-dvh flex bg-[var(--bg-primary)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pb-24 lg:pb-8 pt-safe-top px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
