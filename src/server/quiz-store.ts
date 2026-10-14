import 'server-only';
import { randomUUID } from 'crypto';

export interface StoredQuestion {
  id: string;
  quiz_id: string;
  position: number;
  type: 'mcq' | 'true_false' | 'short_answer' | 'fill_blank';
  prompt: string;
  options?: string[] | null;
  subject: string;
  topic: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
  max_marks: number;
}

export interface StoredAnswerKey {
  question_id: string;
  quiz_id: string;
  correct_option?: number | null;
  correct_bool?: boolean | null;
  accepted_answers?: string[];
  rubric?: {
    key_points: Array<{ point: string; weight: number }>;
    sample_answer: string;
  } | null;
  model_answer?: string | null;
  explanation: string;
  remember_tip: string;
}

export interface StoredQuiz {
  id: string;
  user_id: string;
  title: string;
  source_type: string;
  subject: string;
  topic: string;
  question_count: number;
  settings: {
    difficulty: string;
    types: string;
    isExam: boolean;
    level?: string;
  };
  created_at: string;
}

export interface StoredAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  mode: 'practice' | 'exam';
  status: 'in_progress' | 'marking' | 'marked';
  started_at: string;
  deadline?: string | null;
  duration_seconds?: number | null;
  submitted_at?: string | null;
  marked_at?: string | null;
  score?: number | null;
  max_score?: number | null;
  correct_count?: number | null;
  partial_count?: number | null;
  incorrect_count?: number | null;
  unanswered_count?: number | null;
  time_taken_seconds?: number | null;
}

export interface StoredAttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  user_id: string;
  answer: unknown;
  flagged: boolean;
  awarded_marks: number;
  max_marks: number;
  verdict: 'correct' | 'partial' | 'incorrect' | 'unanswered';
  feedback: {
    text: string;
    given: string;
    correct: string;
    explanation: string;
    remember_tip: string;
    key_points_hit?: string[];
    key_points_missed?: string[];
  };
}

// Global server memory cache
class QuizStore {
  private quizzes = new Map<string, StoredQuiz>();
  private questions = new Map<string, StoredQuestion[]>(); // quiz_id -> questions
  private answerKeys = new Map<string, Map<string, StoredAnswerKey>>(); // quiz_id -> question_id -> key
  private attempts = new Map<string, StoredAttempt>();
  private attemptAnswers = new Map<string, StoredAttemptAnswer[]>(); // attempt_id -> answers

  createQuiz(params: Omit<StoredQuiz, 'id' | 'created_at'>): StoredQuiz {
    const id = randomUUID();
    const quiz: StoredQuiz = {
      ...params,
      id,
      created_at: new Date().toISOString(),
    };
    this.quizzes.set(id, quiz);
    return quiz;
  }

  getQuiz(id: string): StoredQuiz | undefined {
    return this.quizzes.get(id);
  }

  getAllQuizzes(): StoredQuiz[] {
    return Array.from(this.quizzes.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  saveQuestions(quizId: string, questions: StoredQuestion[], keys: StoredAnswerKey[]): void {
    this.questions.set(quizId, questions);
    const keyMap = new Map<string, StoredAnswerKey>();
    for (const k of keys) {
      keyMap.set(k.question_id, k);
    }
    this.answerKeys.set(quizId, keyMap);
  }

  getQuestions(quizId: string): StoredQuestion[] {
    return this.questions.get(quizId) || [];
  }

  getAnswerKey(quizId: string, questionId: string): StoredAnswerKey | undefined {
    return this.answerKeys.get(quizId)?.get(questionId);
  }

  getAnswerKeys(quizId: string): StoredAnswerKey[] {
    const map = this.answerKeys.get(quizId);
    return map ? Array.from(map.values()) : [];
  }

  createAttempt(params: Omit<StoredAttempt, 'id'>): StoredAttempt {
    const id = randomUUID();
    const attempt: StoredAttempt = {
      ...params,
      id,
    };
    this.attempts.set(id, attempt);
    return attempt;
  }

  getAttempt(id: string): StoredAttempt | undefined {
    return this.attempts.get(id);
  }

  getAttemptByQuizId(quizId: string): StoredAttempt | undefined {
    return Array.from(this.attempts.values()).find((a) => a.quiz_id === quizId);
  }

  updateAttempt(id: string, updates: Partial<StoredAttempt>): StoredAttempt | undefined {
    const existing = this.attempts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.attempts.set(id, updated);
    return updated;
  }

  saveAttemptAnswers(attemptId: string, answers: StoredAttemptAnswer[]): void {
    this.attemptAnswers.set(attemptId, answers);
  }

  getAttemptAnswers(attemptId: string): StoredAttemptAnswer[] {
    return this.attemptAnswers.get(attemptId) || [];
  }
}

// Global singleton across hot reloads in dev
const globalForQuizStore = globalThis as unknown as { quizStore?: QuizStore };
export const quizStore = globalForQuizStore.quizStore ?? new QuizStore();
if (process.env.NODE_ENV !== 'production') {
  globalForQuizStore.quizStore = quizStore;
}
