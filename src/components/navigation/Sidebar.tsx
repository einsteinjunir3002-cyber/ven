'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, GraduationCap, Target, User, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/library', label: 'Library', icon: BookOpen },
  { href: '/learn', label: 'Learn', icon: GraduationCap },
  { href: '/practice', label: 'Practice', icon: Target },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center font-bold text-xl shadow-md">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg text-[var(--text-primary)] leading-tight">
            Venessa Study
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-medium">AI Study Companion</p>
        </div>
      </div>

      <nav aria-label="Desktop sidebar navigation" className="flex-1 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150',
                isActive
                  ? 'bg-[var(--brand-light)] text-[var(--brand-primary)] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              )}
            >
              <Icon className={clsx('w-5 h-5', isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-[var(--border-subtle)] px-2">
        <div className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">Venessa Ponohazo</p>
          <p className="text-[var(--text-muted)] mt-0.5">Personal Study Workspace</p>
        </div>
      </div>
    </aside>
  );
}
