'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Target,
  Sparkles,
  Timer,
  RotateCcw,
  ShieldAlert,
  BookOpen,
  Atom,
  Binary,
  Landmark,
  Calculator,
  Compass,
  FileText,
  CheckCircle2,
  HelpCircle,
  Clock,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SubjectPreset {
  id: string;
  name: string;
  icon: string;
  color: string;
  topics: string[];
}

const SUBJECT_PRESETS: SubjectPreset[] = [
  {
    id: 'biology',
    name: 'Biology',
    icon: '🧬',
    color: 'from-emerald-500 to-teal-600',
    topics: ['Cell Biology', 'Photosynthesis', 'Human Reproduction', 'Genetics & DNA', 'Ecology'],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    icon: '🧪',
    color: 'from-cyan-500 to-blue-600',
    topics: ['Chemical Bonding', 'Organic Reactions', 'Acids & Bases', 'Stoichiometry', 'Periodic Table'],
  },
  {
    id: 'physics',
    name: 'Physics',
    icon: '⚡',
    color: 'from-indigo-500 to-violet-600',
    topics: ['Newtonian Mechanics', 'Electromagnetism', 'Thermodynamics', 'Waves & Optics', 'Work & Energy'],
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    icon: '📐',
    color: 'from-amber-500 to-orange-600',
    topics: ['Calculus & Derivatives', 'Linear Algebra', 'Quadratic Equations', 'Trigonometry', 'Probability'],
  },
  {
    id: 'computer_science',
    name: 'Computer Science',
    icon: '💻',
    color: 'from-purple-500 to-pink-600',
    topics: ['Data Structures', 'Algorithms & Big-O', 'Object Oriented Programming', 'Databases & SQL', 'Networking'],
  },
  {
    id: 'history',
    name: 'World History',
    icon: '🏛️',
    color: 'from-rose-500 to-red-600',
    topics: ['World War I & II', 'Ancient Rome', 'The Industrial Revolution', 'Cold War', 'The Renaissance'],
  },
];

export default function PracticeHubPage() {
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState<string>('Biology');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectText, setCustomSubjectText] = useState('');
  const [topic, setTopic] = useState('Cell Biology');
  const [academicLevel, setAcademicLevel] = useState('High School');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [questionType, setQuestionType] = useState<'mcq' | 'true_false' | 'short_answer' | 'fill_blank' | 'mixed'>('mixed');
  const [isExam, setIsExam] = useState(false);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [contextNotes, setContextNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryTopic = urlParams.get('topic');
    const querySubject = urlParams.get('subject');
    if (querySubject) {
      setSelectedSubject(querySubject);
      const match = SUBJECT_PRESETS.find((s) => s.name.toLowerCase() === querySubject.toLowerCase());
      if (!match) {
        setIsCustomSubject(true);
        setCustomSubjectText(querySubject);
      }
    }
    if (queryTopic) setTopic(queryTopic);
  }, []);

  const handleSelectPresetSubject = (preset: SubjectPreset) => {
    setIsCustomSubject(false);
    setSelectedSubject(preset.name);
    if (!preset.topics.includes(topic)) {
      setTopic(preset.topics[0] || 'Fundamentals');
    }
  };

  const activeSubjectName = isCustomSubject ? customSubjectText.trim() || 'Custom Subject' : selectedSubject;
  const currentPreset = SUBJECT_PRESETS.find((s) => s.name === selectedSubject);

  const handleStartQuiz = async () => {
    if (!topic.trim()) {
      setErrorMessage('Please specify a topic for your assessment.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    setGenerationStep('Designing curriculum questions with AI...');

    try {
      const res = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'topic',
          subject: activeSubjectName,
          topic: topic.trim(),
          level: academicLevel,
          count: questionCount,
          difficulty,
          types: questionType,
          isExam,
          contextNotes: contextNotes.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to generate quiz: ${res.statusText}`);
      }

      setGenerationStep('Formatting rubrics and explanation keys...');
      const data = await res.json();

      if (data.attempt?.id) {
        router.push(`/practice/quiz/${data.attempt.id}`);
      } else if (data.quiz?.id) {
        router.push(`/practice/quiz/${data.quiz.id}`);
      } else {
        throw new Error('Quiz creation returned unexpected payload');
      }
    } catch (err) {
      setIsGenerating(false);
      setErrorMessage((err as Error).message || 'Generation failed. Please try again.');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            AI Assessment Creator 🎯
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Create tailored quizzes &amp; exams by subject and topic with instant AI grading
          </p>
        </div>
        <Link
          href="/practice/mistakes"
          className="min-touch-target px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <RotateCcw className="w-4 h-4 text-rose-500" />
          <span>My Mistakes</span>
        </Link>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between animate-fade-in">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="font-bold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Creation Card */}
      <div className="p-5 sm:p-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-6">
        {/* Step 1: Subject Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <span>1. Choose Subject</span>
              <span className="text-[var(--brand-primary)]">•</span>
              <span className="text-[var(--text-secondary)] font-medium capitalize">{activeSubjectName}</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setIsCustomSubject((prev) => !prev);
                if (!isCustomSubject) setCustomSubjectText('');
              }}
              className="text-xs text-[var(--brand-primary)] font-semibold hover:underline"
            >
              {isCustomSubject ? 'Pick from Presets' : '+ Enter Custom Subject'}
            </button>
          </div>

          {isCustomSubject ? (
            <input
              type="text"
              value={customSubjectText}
              onChange={(e) => setCustomSubjectText(e.target.value)}
              placeholder="e.g. Neuroscience, Economics, Organic Chemistry, Philosophy..."
              className="w-full px-4 py-3 bg-[var(--bg-elevated)] border-2 border-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] rounded-2xl text-sm font-semibold outline-none text-[var(--text-primary)]"
              autoFocus
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SUBJECT_PRESETS.map((preset) => {
                const isSelected = selectedSubject === preset.name && !isCustomSubject;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPresetSubject(preset)}
                    className={`min-touch-target p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-[var(--brand-light)] border-[var(--brand-primary)] text-[var(--brand-primary)] shadow-xs font-bold'
                        : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <span className="text-xl shrink-0">{preset.icon}</span>
                    <span className="text-xs font-semibold truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Topic & Subtopics */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
            2. Topic or Subtopic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Calvin Cycle, Quadratic Formula, Momentum Conservation, Enzyme Kinetics"
            className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl text-sm font-medium outline-none focus:border-[var(--brand-primary)] text-[var(--text-primary)]"
          />

          {/* Quick topic suggestion chips */}
          {currentPreset && !isCustomSubject && (
            <div className="pt-1">
              <span className="text-[11px] text-[var(--text-muted)] block mb-1.5 font-medium">
                Suggested topics for {selectedSubject}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentPreset.topics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-colors ${
                      topic === t
                        ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Settings Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
            3. Configuration &amp; Format
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                Level
              </span>
              <select
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-medium text-[var(--text-primary)]"
              >
                <option value="Middle School">Middle School</option>
                <option value="High School">High School (GCSE)</option>
                <option value="AP / A-Level">AP / A-Level / IB</option>
                <option value="Undergraduate">College / Univ</option>
              </select>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                Questions
              </span>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-medium text-[var(--text-primary)]"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={20}>20 Questions</option>
              </select>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                Difficulty
              </span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-medium text-[var(--text-primary)]"
              >
                <option value="mixed">Mixed Adaptive</option>
                <option value="easy">Easy Foundation</option>
                <option value="medium">Medium Standard</option>
                <option value="hard">Hard Mastery</option>
              </select>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                Type
              </span>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as any)}
                className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-medium text-[var(--text-primary)]"
              >
                <option value="mixed">All Mixed</option>
                <option value="mcq">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
                <option value="fill_blank">Fill in Blank</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 4: Optional Notes / Syllabus Accordion */}
        <div className="border border-[var(--border-subtle)] rounded-2xl p-3.5 bg-[var(--bg-elevated)] space-y-2">
          <button
            type="button"
            onClick={() => setShowNotesDrawer((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Attach Custom Notes or Syllabus Focus (Optional)</span>
            </span>
            {showNotesDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showNotesDrawer && (
            <div className="pt-2 space-y-1.5 animate-fade-in">
              <textarea
                rows={3}
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                placeholder="Paste class notes, book paragraphs, or specific syllabus points here. The AI will formulate questions directly testing this material."
                className="w-full p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] resize-none"
              />
              <p className="text-[11px] text-[var(--text-muted)]">
                Leave blank to generate questions from comprehensive global academic standards.
              </p>
            </div>
          )}
        </div>

        {/* Mode Toggle: Practice vs Exam */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Exam Mode</span>
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {isExam ? 'Strict countdown timer, no tutor hints, auto-submit on expiry' : 'Untimed, relaxed learning mode'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsExam((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              isExam
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
            }`}
          >
            {isExam ? 'Exam ON' : 'Practice Mode'}
          </button>
        </div>

        {/* Generate / Start Button */}
        <button
          type="button"
          onClick={handleStartQuiz}
          disabled={isGenerating || !topic.trim()}
          className="w-full min-touch-target bg-[var(--brand-primary)] text-white font-bold rounded-2xl py-4 text-sm shadow-md hover:opacity-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
              <span>{generationStep || 'Generating Questions...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>
                {isExam ? `Start Timed Exam (${questionCount} Qs)` : `Generate & Start Assessment (${questionCount} Qs)`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Weak Areas Practice Highlight */}
      <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-[var(--text-primary)]">
            Weak Areas &amp; Target Concept Practice
          </h2>
          <Link
            href="/practice/mistakes"
            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
          >
            View Missed Questions
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => {
              setSelectedSubject('Biology');
              setTopic('Photosynthesis Calvin Cycle');
            }}
            className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] hover:bg-[var(--brand-light)] border border-[var(--border-subtle)] text-left space-y-1 transition-colors"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-rose-600">
              <span>🔴 Review Needed</span>
            </div>
            <p className="font-semibold text-xs text-[var(--text-primary)]">Calvin Cycle Reactions</p>
            <p className="text-[10px] text-[var(--text-muted)]">Biology • Click to load</p>
          </button>

          <button
            onClick={() => {
              setSelectedSubject('Chemistry');
              setTopic('Chemical Bonding & VSEPR');
            }}
            className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] hover:bg-[var(--brand-light)] border border-[var(--border-subtle)] text-left space-y-1 transition-colors"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-amber-600">
              <span>🟡 Developing</span>
            </div>
            <p className="font-semibold text-xs text-[var(--text-primary)]">VSEPR &amp; Dipoles</p>
            <p className="text-[10px] text-[var(--text-muted)]">Chemistry • Click to load</p>
          </button>

          <button
            onClick={() => {
              setSelectedSubject('Physics');
              setTopic('Newtonian Momentum Conservation');
            }}
            className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] hover:bg-[var(--brand-light)] border border-[var(--border-subtle)] text-left space-y-1 transition-colors"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600">
              <span>🟢 High Accuracy</span>
            </div>
            <p className="font-semibold text-xs text-[var(--text-primary)]">Momentum Collisions</p>
            <p className="text-[10px] text-[var(--text-muted)]">Physics • Click to load</p>
          </button>
        </div>
      </div>
    </div>
  );
}
