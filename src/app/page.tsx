'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const onboarded = localStorage.getItem('venessa-onboarded');
    if (!onboarded) {
      router.replace('/onboarding');
    } else {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="animate-pulse text-sm text-[var(--text-muted)] font-medium">
        Loading Venessa Study...
      </div>
    </div>
  );
}
