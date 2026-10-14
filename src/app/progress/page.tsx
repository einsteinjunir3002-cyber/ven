'use client';

import React, { useState } from 'react';
import { LineChart, Trophy, Target, BookOpen, Clock, Flame, Calendar } from 'lucide-react';

export default function ProgressPage() {
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('7d');

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Your Progress 📈
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Real study analytics, quiz performance, and streak tracking
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-xs font-semibold">
          <button
            onClick={() => setRange('7d')}
            className={`px-2.5 py-1 rounded-lg ${range === '7d' ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-muted)]'}`}
          >
            7 Days
          </button>
          <button
            onClick={() => setRange('30d')}
            className={`px-2.5 py-1 rounded-lg ${range === '30d' ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-muted)]'}`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-xs text-[var(--text-muted)]">Average Score</span>
          <p className="font-display font-bold text-2xl text-[var(--brand-primary)]">86%</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-xs text-[var(--text-muted)]">Quizzes Taken</span>
          <p className="font-display font-bold text-2xl text-[var(--text-primary)]">14</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-xs text-[var(--text-muted)]">Questions Answered</span>
          <p className="font-display font-bold text-2xl text-[var(--text-primary)]">128</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-xs text-[var(--text-muted)]">Study Time</span>
          <p className="font-display font-bold text-2xl text-[var(--text-primary)]">8.4 hrs</p>
        </div>
      </div>

      {/* Accessible SVG Score Trend Chart (Readable at 360px) */}
      <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
            <LineChart className="w-5 h-5 text-[var(--brand-primary)]" />
            <span>Score Trend Over Time</span>
          </h2>
          <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">+14% vs last week</span>
        </div>

        {/* Hand-built responsive SVG line chart */}
        <div className="h-44 w-full pt-2">
          <svg className="w-full h-full" viewBox="0 0 320 120" preserveAspectRatio="none">
            {/* Gridlines */}
            <line x1="0" y1="30" x2="320" y2="30" stroke="var(--border-subtle)" strokeDasharray="3 3" />
            <line x1="0" y1="60" x2="320" y2="60" stroke="var(--border-subtle)" strokeDasharray="3 3" />
            <line x1="0" y1="90" x2="320" y2="90" stroke="var(--border-subtle)" strokeDasharray="3 3" />

            {/* Score trend path */}
            <path
              d="M 10 90 L 60 70 L 110 80 L 160 40 L 210 45 L 260 20 L 310 15"
              fill="none"
              stroke="var(--brand-primary)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points */}
            <circle cx="10" cy="90" r="4" fill="var(--brand-primary)" />
            <circle cx="60" cy="70" r="4" fill="var(--brand-primary)" />
            <circle cx="110" cy="80" r="4" fill="var(--brand-primary)" />
            <circle cx="160" cy="40" r="4" fill="var(--brand-primary)" />
            <circle cx="210" cy="45" r="4" fill="var(--brand-primary)" />
            <circle cx="260" cy="20" r="4" fill="var(--brand-primary)" />
            <circle cx="310" cy="15" r="4" fill="var(--brand-primary)" />
          </svg>
        </div>

        <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-mono px-1">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </div>

      {/* Gentle Streak Card */}
      <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-500 fill-amber-500" />
            <h3 className="font-display font-bold text-base">5 Day Study Streak</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
            Gentle Mode ON
          </span>
        </div>
        <p className="text-xs leading-relaxed">
          You&apos;ve completed real study sessions 5 days in a row! 1 rest day per week built-in so taking a break never breaks your momentum.
        </p>
      </div>
    </div>
  );
}
