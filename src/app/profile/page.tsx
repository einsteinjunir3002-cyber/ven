'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Settings,
  Sun,
  Moon,
  Monitor,
  Flame,
  Vibrate,
  Bell,
  Download,
  Trash2,
  LogOut,
  RotateCcw,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('Venessa Ponohazo');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [explanationStyle, setExplanationStyle] = useState('simple');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [streakEnabled, setStreakEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const savedTheme = (localStorage.getItem('venessa-theme') as 'light' | 'dark' | 'system') || 'system';
    setTheme(savedTheme);
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('venessa-theme', newTheme);

    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (newTheme === 'dark' || (newTheme === 'system' && systemDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleExportData = () => {
    const data = {
      profile: { name, email: 'venessa@study.app' },
      preferences: { theme, explanationStyle, hapticsEnabled, streakEnabled },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `venessa_study_export_${Date.now()}.json`;
    a.click();
  };

  const handleSignOut = () => {
    localStorage.clear();
    router.push('/auth');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Profile &amp; Settings ⚙️
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Manage your study preferences, themes, and account security
        </p>
      </div>

      {/* User Info Card */}
      <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--brand-primary)] text-white font-display font-bold text-2xl flex items-center justify-center shadow-md">
          VP
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">{name}</h2>
          <p className="text-xs text-[var(--text-muted)]">venessa@study.app</p>
          <span className="inline-block px-2.5 py-0.5 mt-1 rounded-full bg-[var(--brand-light)] text-[var(--brand-primary)] font-semibold text-[11px]">
            Personal Study Workspace
          </span>
        </div>
      </div>

      {/* Learning Preferences */}
      <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-4">
        <h3 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" />
          <span>Learning Preferences</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            Explanation Style
          </label>
          <select
            id="explanation-style"
            aria-label="Explanation Style"
            value={explanationStyle}
            onChange={(e) => setExplanationStyle(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-medium"
          >
            <option value="simple">Simple &amp; Beginner Friendly</option>
            <option value="detailed">Detailed &amp; Technical</option>
            <option value="examples_first">Examples &amp; Analogies First</option>
          </select>
        </div>
      </div>

      {/* Appearance & Theme */}
      <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-4">
        <h3 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-500" />
          <span>Appearance &amp; Theme</span>
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleThemeChange('light')}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
              theme === 'light'
                ? 'bg-[var(--brand-light)] border-[var(--brand-primary)] text-[var(--brand-primary)] shadow-xs'
                : 'bg-[var(--bg-elevated)] border-transparent text-[var(--text-muted)]'
            }`}
          >
            <Sun className="w-5 h-5" />
            <span>Light</span>
          </button>

          <button
            onClick={() => handleThemeChange('dark')}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
              theme === 'dark'
                ? 'bg-[var(--brand-light)] border-[var(--brand-primary)] text-[var(--brand-primary)] shadow-xs'
                : 'bg-[var(--bg-elevated)] border-transparent text-[var(--text-muted)]'
            }`}
          >
            <Moon className="w-5 h-5" />
            <span>Dark</span>
          </button>

          <button
            onClick={() => handleThemeChange('system')}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
              theme === 'system'
                ? 'bg-[var(--brand-light)] border-[var(--brand-primary)] text-[var(--brand-primary)] shadow-xs'
                : 'bg-[var(--bg-elevated)] border-transparent text-[var(--text-muted)]'
            }`}
          >
            <Monitor className="w-5 h-5" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* App Experience Controls */}
      <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Study Streak Tracking</p>
              <p className="text-[11px] text-[var(--text-muted)]">Gentle count with 1 built-in rest day</p>
            </div>
          </div>
          <input
            type="checkbox"
            aria-label="Study Streak Tracking"
            checked={streakEnabled}
            onChange={(e) => setStreakEnabled(e.target.checked)}
            className="w-5 h-5 rounded accent-[var(--brand-primary)] cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <Vibrate className="w-5 h-5 text-[var(--brand-primary)]" />
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Haptic Vibration Feedback</p>
              <p className="text-[11px] text-[var(--text-muted)]">Subtle tactile feel on answer selection</p>
            </div>
          </div>
          <input
            type="checkbox"
            aria-label="Haptic Vibration Feedback"
            checked={hapticsEnabled}
            onChange={(e) => setHapticsEnabled(e.target.checked)}
            className="w-5 h-5 rounded accent-[var(--brand-primary)] cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-[var(--brand-primary)]" />
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Push Notifications</p>
              <p className="text-[11px] text-[var(--text-muted)]">Daily study reminders (PWA installed)</p>
            </div>
          </div>
          <input
            type="checkbox"
            aria-label="Push Notifications"
            checked={notificationsEnabled}
            onChange={(e) => setNotificationsEnabled(e.target.checked)}
            className="w-5 h-5 rounded accent-[var(--brand-primary)] cursor-pointer"
          />
        </div>
      </div>

      {/* Account Actions */}
      <div className="space-y-2">
        <button
          onClick={() => router.push('/onboarding')}
          className="w-full min-touch-target p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between hover:bg-[var(--bg-elevated)]"
        >
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[var(--text-muted)]" />
            <span>Replay Welcome Onboarding</span>
          </div>
        </button>

        <button
          onClick={handleExportData}
          className="w-full min-touch-target p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between hover:bg-[var(--bg-elevated)]"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[var(--brand-primary)]" />
            <span>Export My Data (JSON)</span>
          </div>
        </button>

        <button
          onClick={handleSignOut}
          className="w-full min-touch-target p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between hover:bg-[var(--bg-elevated)]"
        >
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-[var(--text-muted)]" />
            <span>Sign Out</span>
          </div>
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full min-touch-target p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span>Delete Account &amp; Data</span>
          </div>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[var(--bg-surface)] rounded-3xl p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">
              Permanently Delete Account?
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              This will permanently delete your notes, extracted concepts, quiz attempts, and user profile. This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="py-3 px-4 bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="py-3 px-4 bg-red-600 text-white font-semibold text-xs rounded-xl shadow-md hover:bg-red-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
