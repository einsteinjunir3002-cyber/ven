'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  Layers,
  Loader2,
} from 'lucide-react';
import { TeachTopicResult } from '@/server/ai/prompts/teach_topic';

const SUGGESTED_SUBJECTS = [
  {
    subject: 'Cell Biology',
    topics: ['Cell Membrane Structure', 'Mitosis & Meiosis', 'Organelles & Functions', 'Cellular Respiration'],
  },
  {
    subject: 'Genetics',
    topics: ['DNA Replication', 'Mendelian Inheritance', 'Protein Synthesis (Transcription/Translation)', 'Gene Mutations'],
  },
  {
    subject: 'Human Physiology',
    topics: ['Nervous System Impulse Transmission', 'Circulatory System & Heart Cycle', 'Endocrine Hormones', 'Digestive Enzyme Catalysis'],
  },
];

export default function LearnPage() {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [level, setLevel] = useState('High School');
  const [depth, setDepth] = useState<'quick' | 'standard' | 'in_depth'>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonData, setLessonData] = useState<TeachTopicResult | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryTopic = urlParams.get('topic');
    if (queryTopic) {
      setSelectedTopic(queryTopic);
      handleGenerateLesson(queryTopic);
    }
  }, []);

  const handleGenerateLesson = async (topicToTeach?: string) => {
    const targetTopic = topicToTeach || selectedTopic;
    if (!targetTopic.trim()) return;

    setIsGenerating(true);
    setLessonData(null);

    try {
      const res = await fetch('/api/lessons/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'topic',
          topic: targetTopic,
          level,
          depth,
        }),
      });

      const data = await res.json();
      setLessonData(data.lesson);
    } catch {
      // Handled via fallback in API route
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Learn Any Topic 🎓
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Beginner-friendly masterclass lessons built from first principles
        </p>
      </div>

      {/* Generator Form */}
      <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
            What topic do you want to learn?
          </label>
          <input
            type="text"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            placeholder="e.g., Photosynthesis, Quadratic Equations, Quantum Mechanics"
            className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:border-[var(--brand-primary)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Level (Optional)
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs"
            >
              <option value="High School">High School</option>
              <option value="Undergraduate">Undergraduate / College</option>
              <option value="Beginner">General Beginner</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Lesson Depth
            </label>
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value as 'quick' | 'standard' | 'in_depth')}
              className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs"
            >
              <option value="quick">Quick Overview</option>
              <option value="standard">Standard Lesson</option>
              <option value="in_depth">In-Depth Deep Dive</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => handleGenerateLesson()}
          disabled={!selectedTopic.trim() || isGenerating}
          className="w-full min-touch-target bg-[var(--brand-primary)] text-white font-semibold rounded-2xl py-3.5 text-sm shadow-md hover:opacity-95 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Building your lesson...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Generate Lesson</span>
            </>
          )}
        </button>
      </div>

      {/* Suggested Topics List */}
      {!lessonData && !isGenerating && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-[var(--text-primary)]">
              Suggested Topics
            </h2>
            <span className="text-[11px] text-[var(--text-muted)]">General Curriculum Outline</span>
          </div>

          <div className="space-y-3">
            {SUGGESTED_SUBJECTS.map((group) => (
              <div
                key={group.subject}
                className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2.5"
              >
                <span className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wide">
                  {group.subject}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.topics.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedTopic(t);
                        handleGenerateLesson(t);
                      }}
                      className="p-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--brand-light)] text-left text-xs font-semibold text-[var(--text-primary)] transition-colors flex items-center justify-between"
                    >
                      <span>{t}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rendered Lesson Output */}
      {lessonData && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Lesson Header */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[var(--brand-primary)] to-teal-800 text-white space-y-3 shadow-lg">
            <span className="px-3 py-1 rounded-full bg-white/20 text-white font-semibold text-xs inline-block">
              {level} • {depth.toUpperCase()}
            </span>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">{lessonData.title}</h2>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
              {lessonData.introduction}
            </p>
          </div>

          {/* What You'll Learn */}
          <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <h3 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[var(--brand-primary)]" />
              <span>What You&apos;ll Learn</span>
            </h3>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              {lessonData.what_you_will_learn.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Step-by-Step Sections */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">
              Step-by-Step Explanation
            </h3>
            {lessonData.step_by_step_explanation.map((step) => (
              <div
                key={step.step_number}
                className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2"
              >
                <span className="text-xs font-bold text-[var(--brand-primary)]">
                  STEP {step.step_number}
                </span>
                <h4 className="font-display font-bold text-base text-[var(--text-primary)]">
                  {step.heading}
                </h4>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {step.content}
                </p>
              </div>
            ))}
          </div>

          {/* Analogies & Misconceptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Simple Analogy</span>
              </div>
              <p className="text-xs leading-relaxed">{lessonData.analogies[0]}</p>
            </div>

            <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <HelpCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Common Misconception</span>
              </div>
              <p className="text-xs leading-relaxed">{lessonData.common_misconceptions[0]}</p>
            </div>
          </div>

          {/* Practice Questions (Answers hidden until submitted in Quiz) */}
          <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                Test Yourself (Practice Questions)
              </h3>
              <span className="text-xs text-[var(--text-muted)]">Answers hidden</span>
            </div>

            <div className="space-y-3">
              {lessonData.practice_questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] space-y-2"
                >
                  <p className="font-semibold">
                    Q{idx + 1}: {q.question}
                  </p>
                  {q.options && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px]"
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Link
              href={`/practice?subject=${encodeURIComponent(selectedTopic || 'General Science')}&topic=${encodeURIComponent(lessonData.title)}`}
              className="w-full min-touch-target bg-[var(--brand-primary)] text-white font-semibold rounded-2xl py-3 text-xs shadow-md inline-flex items-center justify-center gap-2"
            >
              <span>Take Full AI Quiz on This Lesson</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Final Revision Sheet */}
          <div className="p-5 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 space-y-2">
            <h4 className="font-display font-bold text-sm">Final Revision Sheet</h4>
            <p className="text-xs leading-relaxed">{lessonData.final_revision_sheet}</p>
          </div>
        </div>
      )}
    </div>
  );
}
