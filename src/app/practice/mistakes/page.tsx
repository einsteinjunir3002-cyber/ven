'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, RotateCcw, Sparkles, HelpCircle, XCircle } from 'lucide-react';
import { formatMathNotation } from '@/lib/math-format';

interface MistakeItem {
  id: string;
  topic: string;
  concept: string;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  rememberTip: string;
  timesMissed: number;
  status: 'active' | 'understood';
}

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('venessa_mistakes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMistakes(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const activeMistakes = mistakes.filter((m) => m.status === 'active');

  const handleMarkUnderstood = (id: string) => {
    setMistakes((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, status: 'understood' as const } : m));
      try {
        localStorage.setItem('venessa_mistakes', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };


  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Link href="/practice" className="min-touch-target text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              My Mistakes ✍️
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Review and practice questions you missed across past attempts
            </p>
          </div>
        </div>
      </div>

      {activeMistakes.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] p-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
            No mistakes to review yet! 🎉
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
            All your past quiz responses were accurate or marked understood. Keep up the strong work!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeMistakes.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 text-xs">
                <span className="font-bold text-[var(--brand-primary)]">
                  {item.topic} • #{item.concept}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 font-semibold">
                  Missed {item.timesMissed}x
                </span>
              </div>

              <h3 className="font-semibold text-sm text-[var(--text-primary)]">{formatMathNotation(item.prompt)}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200">
                  <span className="font-bold block mb-0.5">Your Answer:</span>
                  <span>{formatMathNotation(item.userAnswer)}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
                  <span className="font-bold block mb-0.5">Correct Answer:</span>
                  <span>{formatMathNotation(item.correctAnswer)}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] space-y-1">
                <p className="font-bold text-[var(--text-primary)]">Why?</p>
                <p>{formatMathNotation(item.explanation)}</p>
                <p className="font-semibold text-[var(--brand-primary)] pt-1">💡 Tip: {formatMathNotation(item.rememberTip)}</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => handleMarkUnderstood(item.id)}
                  className="min-touch-target px-3.5 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--brand-light)] text-[var(--brand-primary)] font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark as Understood</span>
                </button>

                <Link
                  href={`/practice?topic=${encodeURIComponent(item.concept)}`}
                  className="min-touch-target px-3.5 py-2 bg-[var(--brand-primary)] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 hover:opacity-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Practice Similar Variant</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
