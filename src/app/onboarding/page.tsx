'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, FileText, BookOpenCheck, LineChart, ArrowRight, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    icon: Sparkles,
    title: 'Meet Your AI Tutor',
    description: 'Personalized study partner for Venessa Ponohazo. Ask questions, clarify complex concepts, and learn faster.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: FileText,
    title: 'Upload Your Notes',
    description: 'Upload PDFs, Word docs, slides, or camera photos. Your tutor extracts key concepts and simplifies them.',
    color: 'from-violet-500 to-indigo-600',
  },
  {
    icon: BookOpenCheck,
    title: 'Learn Any Topic',
    description: 'Enter any subject to get structured, step-by-step lessons built from first principles with simple analogies.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: LineChart,
    title: 'Practice & Master',
    description: 'Auto-generated quizzes, instant rubric marking, weak-area detection, and gentle streak tracking.',
    color: 'from-teal-500 to-cyan-600',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('venessa-onboarded', 'true');
    router.push('/dashboard');
  };

  if (isCompleted) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 shadow-lg animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)] mb-3">
          Welcome, Venessa 👋
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">
          Your personal study space is ready. Let&apos;s turn your notes into knowledge and master your upcoming exams!
        </p>
        <button
          onClick={handleFinish}
          className="w-full min-touch-target bg-[var(--brand-primary)] text-white font-semibold rounded-2xl py-4 text-base shadow-md hover:opacity-95 transition-opacity"
        >
          Start Studying Now
        </button>
      </main>
    );
  }

  const StepIcon = STEPS[currentStep].icon;

  return (
    <main className="min-h-dvh flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Header / Skip button */}
      <div className="flex items-center justify-between pt-safe-top">
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'w-8 bg-[var(--brand-primary)]'
                  : 'w-2 bg-[var(--border-strong)] opacity-50'
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setIsCompleted(true)}
          className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg"
        >
          Skip
        </button>
      </div>

      {/* Main Slide Card */}
      <div className="my-auto py-8 text-center flex flex-col items-center">
        <div
          className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${STEPS[currentStep].color} text-white flex items-center justify-center mb-8 shadow-xl`}
        >
          <StepIcon className="w-14 h-14" />
        </div>
        <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-3">
          {STEPS[currentStep].title}
        </h2>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-xs">
          {STEPS[currentStep].description}
        </p>
      </div>

      {/* Bottom Action Button */}
      <div className="pb-safe-bottom">
        <button
          onClick={handleNext}
          className="w-full min-touch-target bg-[var(--brand-primary)] text-white font-semibold rounded-2xl py-4 text-base shadow-md flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
        >
          <span>{currentStep === STEPS.length - 1 ? 'Continue' : 'Next'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </main>
  );
}
