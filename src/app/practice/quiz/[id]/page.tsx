'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Timer,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  MessageSquare,
  Award,
  Zap,
  Check,
  X,
  Share2,
} from 'lucide-react';
import { openDB } from 'idb';

interface Question {
  id: string;
  quiz_id: string;
  position: number;
  type: 'mcq' | 'true_false' | 'short_answer' | 'fill_blank';
  prompt: string;
  options?: string[] | null;
  subject?: string;
  topic?: string;
  concept?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  max_marks: number;
}

interface AttemptAnswerFeedback {
  text: string;
  given: string;
  correct: string;
  explanation: string;
  remember_tip: string;
  key_points_hit?: string[];
  key_points_missed?: string[];
}

interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: unknown;
  flagged: boolean;
  awarded_marks: number;
  max_marks: number;
  verdict: 'correct' | 'partial' | 'incorrect' | 'unanswered';
  feedback: AttemptAnswerFeedback;
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  mode: 'practice' | 'exam';
  status: 'in_progress' | 'marked';
  started_at: string;
  deadline?: string | null;
  duration_seconds?: number | null;
  score?: number | null;
  max_score?: number | null;
  correct_count?: number | null;
  partial_count?: number | null;
  incorrect_count?: number | null;
  unanswered_count?: number | null;
  time_taken_seconds?: number | null;
}

interface QuizData {
  id: string;
  title: string;
  subject: string;
  topic: string;
  question_count: number;
  settings: {
    difficulty: string;
    types: string;
    isExam: boolean;
    level?: string;
  };
}

export default function QuizRunnerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const quizOrAttemptId = resolvedParams.id;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<{
    attempt: QuizAttempt;
    scorePercentage: number;
    answers: AttemptAnswer[];
  } | null>(null);
  const [resultFilter, setResultFilter] = useState<'all' | 'correct' | 'needs_review'>('all');

  // Exam timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Fetch quiz on mount
  useEffect(() => {
    let isMounted = true;

    async function loadQuiz() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/quizzes/${quizOrAttemptId}`);
        if (!res.ok) {
          throw new Error(`Quiz not found or failed to load (${res.status})`);
        }
        const data = await res.json();
        if (!isMounted) return;

        setQuiz(data.quiz);
        setAttempt(data.attempt);
        setQuestions(data.questions || []);

        // If already marked, populate result screen
        if (data.attempt?.status === 'marked' && data.answers) {
          const maxScore = data.attempt.max_score || 1;
          const score = data.attempt.score || 0;
          setResult({
            attempt: data.attempt,
            scorePercentage: Math.round((score / maxScore) * 100),
            answers: data.answers,
          });
        }

        // Setup timer if exam mode and in progress
        if (data.attempt?.status === 'in_progress' && data.attempt?.deadline) {
          const deadlineTime = new Date(data.attempt.deadline).getTime();
          const remaining = Math.max(0, Math.floor((deadlineTime - Date.now()) / 1000));
          setTimeLeft(remaining);
        } else if (data.quiz?.settings?.isExam && data.attempt?.status === 'in_progress') {
          // Default 90 sec per question if deadline not set
          const totalSec = (data.questions?.length || 5) * 90;
          setTimeLeft(totalSec);
        }
      } catch (err) {
        if (!isMounted) return;
        setLoadError((err as Error).message || 'Failed to load quiz');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadQuiz();
    return () => {
      isMounted = false;
    };
  }, [quizOrAttemptId]);

  // IndexedDB Autosave for answers
  useEffect(() => {
    if (!quiz || !attempt || attempt.status === 'marked' || Object.keys(answers).length === 0) return;

    const saveDraft = async () => {
      try {
        const db = await openDB('venessa-quiz-store', 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('drafts')) {
              db.createObjectStore('drafts');
            }
          },
        });
        await db.put('drafts', { answers, flagged }, `quiz_${quiz.id}`);
      } catch {
        localStorage.setItem(`quiz_draft_${quiz.id}`, JSON.stringify({ answers, flagged }));
      }
    };
    saveDraft();
  }, [quiz, attempt, answers, flagged]);

  // Exam Timer Countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result || !attempt || attempt.status === 'marked') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev !== null ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result, attempt]);

  const handleSubmitQuiz = async () => {
    if (!attempt) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const answersPayload = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? null,
      flagged: !!flagged[q.id],
    }));

    try {
      const res = await fetch('/api/quizzes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt.id,
          answers: answersPayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`Submission failed with status ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setSubmitError((err as Error).message || 'Failed to submit quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAnswer = (ans: unknown) => {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: ans }));
  };

  const handleToggleFlag = () => {
    if (!currentQ) return;
    setFlagged((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  const currentQ = questions[currentIdx];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== '').length;

  // Format time remaining mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ---------------------------------------------------------------------------
  // LOADING / ERROR STATES
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-4">
        <Sparkles className="w-10 h-10 text-[var(--brand-primary)] mx-auto animate-spin" />
        <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
          Loading Your Assessment...
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          Retrieving questions, options, and rubric standards
        </p>
      </div>
    );
  }

  if (loadError || !quiz || questions.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 p-6 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
          Unable to Load Quiz
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          {loadError || 'This assessment could not be found or has expired.'}
        </p>
        <Link
          href="/practice"
          className="inline-flex min-touch-target px-5 py-2.5 bg-[var(--brand-primary)] text-white font-semibold text-xs rounded-xl shadow-md"
        >
          Create New Assessment
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SCORE & MARKING REVEAL VIEW (After Submit)
  // ---------------------------------------------------------------------------
  if (result) {
    const scorePct = result.scorePercentage;
    const isPassing = scorePct >= 70;
    const isExcellent = scorePct >= 85;

    const filteredAnswers = (result.answers || []).filter((ans) => {
      if (resultFilter === 'correct') return ans.verdict === 'correct';
      if (resultFilter === 'needs_review') return ans.verdict !== 'correct';
      return true;
    });

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-28 animate-fade-in">
        {/* Top Celebration Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-lg text-center space-y-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />

          {/* Radial / Score Pill */}
          <div className="w-24 h-24 rounded-full bg-[var(--brand-light)] border-4 border-[var(--brand-primary)] text-[var(--brand-primary)] flex flex-col items-center justify-center mx-auto shadow-md">
            <span className="font-display font-extrabold text-3xl leading-none">{scorePct}%</span>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">Score</span>
          </div>

          <div className="space-y-1">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[var(--text-primary)]">
              {isExcellent
                ? 'Outstanding Mastery! 🎉'
                : isPassing
                ? 'Great Work! Well Done 👍'
                : 'Good Effort! Keep Practicing 💡'}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium">
              {quiz.title} • {quiz.subject}
            </p>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-4 gap-2 py-3 border-y border-[var(--border-subtle)] max-w-lg mx-auto">
            <div className="text-center">
              <span className="block font-display font-bold text-lg text-emerald-600 dark:text-emerald-400">
                {result.attempt.correct_count ?? 0}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase">Correct</span>
            </div>
            <div className="text-center">
              <span className="block font-display font-bold text-lg text-amber-600 dark:text-amber-400">
                {result.attempt.partial_count ?? 0}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase">Partial</span>
            </div>
            <div className="text-center">
              <span className="block font-display font-bold text-lg text-rose-600 dark:text-rose-400">
                {result.attempt.incorrect_count ?? 0}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase">Incorrect</span>
            </div>
            <div className="text-center">
              <span className="block font-display font-bold text-lg text-[var(--text-primary)]">
                {result.attempt.time_taken_seconds ?? 45}s
              </span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase">Time</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/practice"
              className="min-touch-target px-5 py-2.5 bg-[var(--brand-primary)] text-white font-semibold text-xs rounded-xl shadow-md hover:opacity-95 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practice Another Topic</span>
            </Link>
            <Link
              href="/practice/mistakes"
              className="min-touch-target px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs rounded-xl hover:bg-[var(--border-subtle)] transition-colors flex items-center gap-1.5"
            >
              <span>Review Mistake Notebook</span>
            </Link>
          </div>
        </div>

        {/* Detailed Marking & Explanations Header with Filter Tabs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
                Accurate Marking &amp; Explanations 📝
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Step-by-step reasoning for each question marked by AI
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setResultFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  resultFilter === 'all' ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-muted)]'
                }`}
              >
                All ({result.answers.length})
              </button>
              <button
                type="button"
                onClick={() => setResultFilter('correct')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  resultFilter === 'correct' ? 'bg-emerald-600 text-white' : 'text-[var(--text-muted)]'
                }`}
              >
                Correct ({result.attempt.correct_count ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setResultFilter('needs_review')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  resultFilter === 'needs_review' ? 'bg-rose-600 text-white' : 'text-[var(--text-muted)]'
                }`}
              >
                Review ({(result.attempt.incorrect_count ?? 0) + (result.attempt.partial_count ?? 0)})
              </button>
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-4">
            {filteredAnswers.map((ans, idx) => {
              const q = questions.find((item) => item.id === ans.question_id) || questions[idx];
              const isCorrect = ans.verdict === 'correct';
              const isPartial = ans.verdict === 'partial';
              const isUnanswered = ans.verdict === 'unanswered';
              const fb = ans.feedback || {};

              return (
                <div
                  key={ans.id || idx}
                  className={`p-5 sm:p-6 rounded-3xl border shadow-xs space-y-4 transition-all ${
                    isCorrect
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : isPartial
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                      : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between text-xs font-bold border-b border-[var(--border-subtle)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[11px] ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                            : isPartial
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                        }`}
                      >
                        {isCorrect ? '✓ Correct' : isPartial ? '🟡 Partial Credit' : isUnanswered ? '⚪ Unanswered' : '✗ Incorrect'}
                      </span>
                      <span className="text-[var(--text-muted)] font-mono">
                        {ans.awarded_marks} / {ans.max_marks} marks
                      </span>
                    </div>

                    <span className="text-[var(--text-muted)]">
                      Question {q?.position || idx + 1} • #{q?.concept || quiz.topic}
                    </span>
                  </div>

                  {/* Prompt */}
                  <h3 className="font-display font-bold text-base text-[var(--text-primary)] leading-snug">
                    {q?.prompt || 'Question Prompt'}
                  </h3>

                  {/* Student vs Correct Answer Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                      <span className="font-bold text-[var(--text-muted)] block text-[11px]">Your Submitted Answer:</span>
                      <span className={isCorrect ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-rose-700 dark:text-rose-300 font-semibold'}>
                        {fb.given || 'No answer submitted'}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                      <span className="font-bold text-[var(--text-muted)] block text-[11px]">Correct / Model Answer:</span>
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                        {fb.correct || 'Model concept answer'}
                      </span>
                    </div>
                  </div>

                  {/* Rubric Points Hit / Missed (if short answer) */}
                  {(fb.key_points_hit || fb.key_points_missed) && (
                    <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2 text-xs">
                      <span className="font-bold text-[var(--text-primary)] block">Rubric Points Evaluation:</span>
                      {fb.key_points_hit && fb.key_points_hit.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-emerald-600 font-semibold text-[11px]">Points Addressed:</span>
                          <ul className="list-disc list-inside text-emerald-800 dark:text-emerald-300 text-[11px] pl-1">
                            {fb.key_points_hit.map((pt, pIdx) => (
                              <li key={pIdx}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {fb.key_points_missed && fb.key_points_missed.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-rose-600 font-semibold text-[11px]">Points Omitted or Inaccurate:</span>
                          <ul className="list-disc list-inside text-rose-800 dark:text-rose-300 text-[11px] pl-1">
                            {fb.key_points_missed.map((pt, pIdx) => (
                              <li key={pIdx}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Explanation Box */}
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-2 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                      <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
                      <span>Why this is correct (Step-by-Step Explanation):</span>
                    </div>
                    <p className="text-[var(--text-primary)] font-medium whitespace-pre-line">
                      {fb.explanation || fb.text}
                    </p>

                    {fb.remember_tip && (
                      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-start gap-1.5 text-[var(--brand-primary)] font-semibold text-[11px]">
                        <span>💡</span>
                        <span>Remember Tip: {fb.remember_tip}</span>
                      </div>
                    )}
                  </div>

                  {/* Clarify with AI Tutor Button */}
                  <div className="flex justify-end pt-1">
                    <Link
                      href={`/tutor?q=${encodeURIComponent(
                        `I just completed a question on "${q?.prompt}". The correct answer is "${fb.correct}". Can you explain why this is the case and clarify any nuances for me?`
                      )}`}
                      className="min-touch-target px-3.5 py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--brand-light)] hover:text-[var(--brand-primary)] text-[var(--text-secondary)] text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                      <span>Ask AI Tutor to Clarify This</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // REVIEW & SUBMIT STEP
  // ---------------------------------------------------------------------------
  if (isReviewStep) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-fade-in">
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setIsReviewStep(false)}
            className="min-touch-target text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 text-xs font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Questions</span>
          </button>
          <span className="font-display font-bold text-base text-[var(--text-primary)]">
            Review &amp; Submit Assessment
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold border-b border-[var(--border-subtle)] pb-3">
            <span className="text-emerald-600">Answered: {answeredCount} / {totalQ}</span>
            <span className="text-amber-600">Unanswered: {totalQ - answeredCount}</span>
          </div>

          {submitError && (
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {submitError}
            </div>
          )}

          <div className="space-y-2">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
              const isFlagged = !!flagged[q.id];

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIdx(idx);
                    setIsReviewStep(false);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] text-left flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[var(--bg-surface)] font-bold flex items-center justify-center text-[11px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium truncate max-w-[260px] text-[var(--text-primary)]">
                      {q.prompt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isFlagged && <Flag className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                    <span className={isAnswered ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'}>
                      {isAnswered ? 'Answered' : 'Unanswered'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleSubmitQuiz}
            disabled={isSubmitting}
            className="w-full min-touch-target bg-[var(--brand-primary)] text-white font-bold rounded-2xl py-4 text-sm shadow-md hover:opacity-95 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                <span>Marking Answers with AI Examiner...</span>
              </>
            ) : (
              <span>Submit Assessment for Grading</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ACTIVE QUESTION RUNNER VIEW
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => router.push('/practice')}
          className="min-touch-target text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit</span>
        </button>

        {/* Exam Countdown or Progress */}
        {timeLeft !== null && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold shadow-xs ${
              timeLeft < 60
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]'
            }`}
          >
            <Timer className="w-3.5 h-3.5 text-rose-500" />
            <span>{formatTimer(timeLeft)}</span>
          </div>
        )}

        {/* Flag button */}
        <button
          onClick={handleToggleFlag}
          className={`min-touch-target px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            flagged[currentQ.id]
              ? 'bg-amber-100 dark:bg-amber-950 text-amber-600'
              : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <Flag className={`w-3.5 h-3.5 ${flagged[currentQ.id] ? 'fill-amber-500 text-amber-500' : ''}`} />
          <span>{flagged[currentQ.id] ? 'Flagged' : 'Flag'}</span>
        </button>
      </div>

      {/* Progress Dots Bar */}
      <div className="flex items-center gap-1.5 px-1">
        {questions.map((q, idx) => {
          const isAns = answers[q.id] !== undefined && answers[q.id] !== '';
          const isCurr = idx === currentIdx;
          const isFlg = !!flagged[q.id];

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(idx)}
              aria-label={`Jump to question ${idx + 1}`}
              className={`h-2.5 rounded-full transition-all duration-200 cursor-pointer ${
                isCurr
                  ? 'w-7 bg-[var(--brand-primary)]'
                  : isFlg
                  ? 'w-2.5 bg-amber-500'
                  : isAns
                  ? 'w-2.5 bg-emerald-500'
                  : 'w-2.5 bg-[var(--border-strong)]'
              }`}
            />
          );
        })}
      </div>

      {/* Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-6">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-bold">
          <span>Question {currentIdx + 1} of {totalQ}</span>
          <span className="uppercase px-2.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--brand-primary)]">
            {currentQ.type.replace('_', ' ')} • {currentQ.max_marks} {currentQ.max_marks === 1 ? 'mark' : 'marks'}
          </span>
        </div>

        <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--text-primary)] leading-snug">
          {currentQ.prompt}
        </h2>

        {/* MCQ Answer Options */}
        {currentQ.type === 'mcq' && currentQ.options && (
          <div className="space-y-3">
            {currentQ.options.map((option, oIdx) => {
              const letter = String.fromCharCode(65 + oIdx);
              const isSelected = answers[currentQ.id] === oIdx;

              return (
                <button
                  key={oIdx}
                  type="button"
                  onClick={() => handleSelectAnswer(oIdx)}
                  className={`w-full min-touch-target p-4 rounded-2xl border text-left flex items-center gap-3 transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--state-neutral-selected-bg)] border-[var(--state-neutral-selected-border)] text-[var(--state-neutral-selected-text)] font-semibold shadow-xs'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected
                        ? 'bg-[var(--state-neutral-selected-border)] text-white'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="text-sm font-medium">{option}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* True / False Options */}
        {currentQ.type === 'true_false' && (
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((val) => {
              const isSelected = answers[currentQ.id] === val;
              return (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => handleSelectAnswer(val)}
                  className={`min-touch-target py-5 rounded-2xl border font-bold text-sm text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--state-neutral-selected-bg)] border-[var(--state-neutral-selected-border)] text-[var(--state-neutral-selected-text)] shadow-xs'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {val ? 'True' : 'False'}
                </button>
              );
            })}
          </div>
        )}

        {/* Short Answer / Fill in Blank */}
        {(currentQ.type === 'short_answer' || currentQ.type === 'fill_blank') && (
          <div className="space-y-1.5">
            <textarea
              rows={currentQ.type === 'short_answer' ? 4 : 2}
              value={String(answers[currentQ.id] || '')}
              onChange={(e) => handleSelectAnswer(e.target.value)}
              placeholder={
                currentQ.type === 'short_answer'
                  ? 'Type your explanation here. Be concise and address key principles...'
                  : 'Type the missing word or phrase...'
              }
              className="w-full p-4 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] resize-none font-medium"
            />
            {currentQ.type === 'short_answer' && (
              <span className="text-[11px] text-[var(--text-muted)] block text-right">
                {String(answers[currentQ.id] || '').length} characters
              </span>
            )}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIdx((prev) => Math.max(prev - 1, 0))}
          disabled={currentIdx === 0}
          className="min-touch-target px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs rounded-xl disabled:opacity-30 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {currentIdx === totalQ - 1 ? (
          <button
            onClick={() => setIsReviewStep(true)}
            className="min-touch-target px-5 py-2.5 bg-[var(--brand-primary)] text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-1 hover:opacity-95"
          >
            <span>Review &amp; Submit</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setCurrentIdx((prev) => Math.min(prev + 1, totalQ - 1))}
            className="min-touch-target px-5 py-2.5 bg-[var(--brand-primary)] text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-1 hover:opacity-95"
          >
            <span>Next Question</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
