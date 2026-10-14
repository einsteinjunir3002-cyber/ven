'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getOnlineServerSnapshot() {
  return true;
}

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const isOffline = !isOnline;

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 dark:bg-amber-600 text-slate-950 font-medium px-4 py-2 text-xs text-center flex items-center justify-center gap-2 shadow-md"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>You&apos;re offline. Reading notes &amp; saved quizzes work! AI features will retry on reconnect.</span>
    </div>
  );
}
