import { describe, it, expect } from 'vitest';
import { generateDynamicQuestions } from '@/server/ai/generators/dynamic_questions';

describe('AI Question Generator across Subjects & Topics', () => {
  it('generates high-quality questions for Mathematics with explanations and memory tips', () => {
    const res = generateDynamicQuestions({
      subject: 'Mathematics',
      topic: 'Calculus & Derivatives',
      count: 4,
      difficulty: 'medium',
      types: 'mixed',
      level: 'High School',
    });

    expect(res.subject).toBe('Mathematics');
    expect(res.topic).toBe('Calculus & Derivatives');
    expect(res.questions.length).toBe(4);

    for (const q of res.questions) {
      expect(q.prompt).toBeTruthy();
      expect(q.explanation).toBeTruthy();
      expect(q.explanation.length).toBeGreaterThan(15);
      expect(q.remember_tip).toBeTruthy();
      expect(q.concept).toBeTruthy();

      if (q.type === 'mcq') {
        expect(q.options?.length).toBe(4);
        expect(q.correct_option).toBeDefined();
      } else if (q.type === 'true_false') {
        expect(typeof q.correct_bool).toBe('boolean');
      } else if (q.type === 'short_answer') {
        expect(q.rubric?.key_points.length).toBeGreaterThan(0);
        expect(q.rubric?.sample_answer).toBeTruthy();
      } else if (q.type === 'fill_blank') {
        expect(q.accepted_answers?.length).toBeGreaterThan(0);
      }
    }
  });

  it('generates questions for Chemistry with subject-specific accuracy', () => {
    const res = generateDynamicQuestions({
      subject: 'Chemistry',
      topic: 'Chemical Bonding',
      count: 3,
      difficulty: 'hard',
      types: 'mcq',
      level: 'Undergraduate',
    });

    expect(res.questions.length).toBe(3);
    for (const q of res.questions) {
      expect(q.type).toBe('mcq');
      expect(q.options?.length).toBe(4);
      expect(q.explanation).toContain('bond');
      expect(q.remember_tip).toBeTruthy();
    }
  });

  it('generates questions for Computer Science algorithms', () => {
    const res = generateDynamicQuestions({
      subject: 'Computer Science',
      topic: 'Data Structures',
      count: 4,
      difficulty: 'easy',
      types: 'mixed',
    });

    expect(res.questions.length).toBe(4);
    const shortAnswerQ = res.questions.find((q) => q.type === 'short_answer');
    expect(shortAnswerQ).toBeDefined();
    expect(shortAnswerQ?.rubric?.key_points.length).toBeGreaterThan(0);
  });
});
