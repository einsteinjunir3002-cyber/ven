'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Upload,
  BookOpen,
  Target,
  RotateCcw,
  Flame,
  ArrowRight,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { IntentResult } from '@/server/ai/prompts/intent';

const ROTATING_EXAMPLES = [
  'Explain photosynthesis step-by-step',
  'Teach me algebra for beginners',
  'Quiz me on cell biology',
  'Explain my uploaded chemistry notes',
  'Give me memory tricks for human anatomy',
];

export default function DashboardPage() {
  const router = useRouter();
  const [greeting, setGreeting] = useState('Good day');
  const [userName, setUserName] = useState('Venessa');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [isRouting, setIsRouting] = useState(false);
  const [intentConfirm, setIntentConfirm] = useState<IntentResult | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<Array<{ id: string; quizId: string; title: string; subject: string; score: number; maxScore: number; percentage: number; date: string }>>([]);
  const [recentMaterials, setRecentMaterials] = useState<Array<{ id: string; title: string; subject: string; page_count: number }>>([]);

  // Time-aware greeting, session name, and live local records
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    try {
      const sess = localStorage.getItem('venessa-session');
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed.name) setUserName(parsed.name.split(' ')[0] || parsed.name);
      }
      const atts = localStorage.getItem('venessa_attempts');
      if (atts) {
        const parsedAtts = JSON.parse(atts);
        if (Array.isArray(parsedAtts)) setRecentAttempts(parsedAtts);
      }
      const mats = localStorage.getItem('venessa_materials');
      if (mats) {
        const parsedMats = JSON.parse(mats);
        if (Array.isArray(parsedMats)) setRecentMaterials(parsedMats);
      }
    } catch {
      // ignore
    }
  }, []);


  // Rotating placeholder
  useEffect(() => {
    if (isFocused) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_EXAMPLES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isFocused]);

  const handleAIQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;

    setIsRouting(true);
    try {
      const res = await fetch('/api/ai/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: queryText }),
      });
      const data: IntentResult = await res.json();
      setIsRouting(false);

      if (data.confidence < 0.75) {
        setIntentConfirm(data);
      } else {
        executeIntent(data.action, data.topic);
      }
    } catch {
      setIsRouting(false);
      // Fallback intent routing to teach topic
      executeIntent('teach_topic', queryText);
    }
  };

  const executeIntent = (action: IntentResult['action'], topic: string) => {
    const query = encodeURIComponent(topic || queryText);
    if (action === 'teach_topic') {
      router.push(`/learn?topic=${query}`);
    } else if (action === 'explain_note') {
      router.push(`/library?search=${query}`);
    } else if (action === 'generate_quiz') {
      router.push(`/practice?topic=${query}`);
    } else {
      router.push(`/tutor?q=${query}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {greeting}, {userName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            What would you like to learn today?
          </p>
        </div>

        {/* Streak Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 font-semibold text-xs shadow-xs">
          <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
          <span>5 Day Streak</span>
        </div>
      </div>

      {/* Prominent Rounded AI Search/Learn Bar */}
      <form
        onSubmit={handleAIQuerySubmit}
        className="relative bg-[var(--bg-surface)] border-2 border-[var(--brand-primary)]/30 focus-within:border-[var(--brand-primary)] rounded-3xl p-2.5 sm:p-3 shadow-md transition-all duration-200"
      >
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-[var(--brand-primary)] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={`Try: "${ROTATING_EXAMPLES[placeholderIndex]}"`}
            className="flex-1 bg-transparent text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
          />
          <button
            type="submit"
            disabled={!queryText.trim() || isRouting}
            className="min-touch-target px-4 py-2.5 bg-[var(--brand-primary)] text-white font-medium text-xs sm:text-sm rounded-2xl hover:opacity-95 disabled:opacity-40 transition-opacity shadow-xs flex items-center gap-1.5 shrink-0"
          >
            {isRouting ? 'Understanding...' : 'Go'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Intent Confirmation Dialog when confidence < 0.75 */}
      {intentConfirm && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200 space-y-3 shadow-md animate-fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>AI Intent Confirmation</span>
          </div>
          <p>{intentConfirm.explanation}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => executeIntent(intentConfirm.action, intentConfirm.topic)}
              className="px-3 py-1.5 bg-indigo-600 text-white font-medium rounded-xl text-xs"
            >
              Yes, proceed
            </button>
            <button
              onClick={() => executeIntent('teach_topic', queryText)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 text-slate-800 dark:text-slate-200 font-medium rounded-xl text-xs"
            >
              Teach as Topic
            </button>
            <button
              onClick={() => executeIntent('generate_quiz', queryText)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 text-slate-800 dark:text-slate-200 font-medium rounded-xl text-xs"
            >
              Quiz Me
            </button>
          </div>
        </div>
      )}

      {/* 4 Large Quick Action Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Link
          href="/library?action=upload"
          className="min-touch-target p-4 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between h-32"
        >
          <Upload className="w-7 h-7" />
          <div>
            <h3 className="font-semibold text-base leading-tight">Upload Notes</h3>
            <p className="text-xs text-emerald-100 mt-0.5">PDF, DOCX, Photos</p>
          </div>
        </Link>

        <Link
          href="/learn"
          className="min-touch-target p-4 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between h-32"
        >
          <BookOpen className="w-7 h-7" />
          <div>
            <h3 className="font-semibold text-base leading-tight">Learn Topic</h3>
            <p className="text-xs text-violet-100 mt-0.5">Step-by-Step AI</p>
          </div>
        </Link>

        <Link
          href="/practice"
          className="min-touch-target p-4 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between h-32"
        >
          <Target className="w-7 h-7" />
          <div>
            <h3 className="font-semibold text-base leading-tight">Start Practice</h3>
            <p className="text-xs text-amber-100 mt-0.5">Quiz &amp; Exam Mode</p>
          </div>
        </Link>

        <Link
          href="/practice/mistakes"
          className="min-touch-target p-4 rounded-3xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between h-32"
        >
          <RotateCcw className="w-7 h-7" />
          <div>
            <h3 className="font-semibold text-base leading-tight">Review Mistakes</h3>
            <p className="text-xs text-rose-100 mt-0.5">Master Weak Spots</p>
          </div>
        </Link>
      </div>

      {/* Continue Studying / Active Learning Card */}
      {recentAttempts.length > 0 ? (
        <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-wider">
              Latest Assessment
            </span>
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Recent
            </span>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              {recentAttempts[0].title}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
              Subject: {recentAttempts[0].subject} • Scored {recentAttempts[0].score}/{recentAttempts[0].maxScore} ({recentAttempts[0].percentage}%)
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
            <div className="text-xs text-[var(--text-muted)]">
              Score: <span className="font-bold text-[var(--brand-primary)]">{recentAttempts[0].percentage}%</span>
            </div>
            <Link
              href={`/practice/quiz/${recentAttempts[0].quizId}`}
              className="min-touch-target px-4 py-2 bg-[var(--brand-light)] text-[var(--brand-primary)] font-semibold text-xs rounded-xl hover:bg-[var(--brand-primary)] hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Review / Retake</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : recentMaterials.length > 0 ? (
        <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-wider">
              Continue Studying
            </span>
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              {recentMaterials[0].title}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Subject: {recentMaterials[0].subject} • {recentMaterials[0].page_count} Pages
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
            <div className="text-xs text-[var(--text-muted)]">Study material loaded</div>
            <Link
              href={`/library/${recentMaterials[0].id}`}
              className="min-touch-target px-4 py-2 bg-[var(--brand-light)] text-[var(--brand-primary)] font-semibold text-xs rounded-xl hover:bg-[var(--brand-primary)] hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/60 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>AI Study Hub Initialized</span>
          </div>
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
            Ready to master your curriculum?
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Generate custom AI assessments on any topic, learn from first principles, or upload your class notes to start practicing right away.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href="/practice"
              className="px-4 py-2 bg-[var(--brand-primary)] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <span>Start Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/library?action=upload"
              className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs rounded-xl flex items-center gap-1.5"
            >
              <span>Upload Notes</span>
            </Link>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
            Recent Activity
          </h2>
          <Link href="/progress" className="text-xs font-medium text-[var(--brand-primary)] hover:underline">
            See all
          </Link>
        </div>

        {recentAttempts.length > 0 ? (
          <div className="space-y-2">
            {recentAttempts.slice(0, 3).map((att) => (
              <div
                key={att.id}
                className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{att.title}</p>
                  <p className="text-[var(--text-muted)]">
                    Score: {att.score}/{att.maxScore} ({att.percentage}%) • {att.subject}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full font-bold ${
                  att.percentage >= 70
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                }`}>
                  {att.percentage}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
            No quiz attempts yet. Your live scores and study records will appear here as you take tests!
          </div>
        )}
      </div>
    </div>
  );
}

