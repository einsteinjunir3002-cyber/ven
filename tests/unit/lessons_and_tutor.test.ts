import { describe, it, expect } from 'vitest';
import { generateDynamicLesson } from '@/server/ai/generators/dynamic_lessons';
import { generateDynamicTutorResponse } from '@/server/ai/generators/dynamic_tutor';

describe('Dynamic Lessons & Tutor AI Generator', () => {
  it('generates a rich first-principles curriculum for custom topic and subject', () => {
    const lesson = generateDynamicLesson({
      topic: 'Quantum Entanglement',
      subject: 'Physics',
      level: 'Undergraduate',
      depth: 'in_depth',
    });

    expect(lesson.title).toContain('Quantum Entanglement');
    expect(lesson.introduction).toContain('Quantum Entanglement');
    expect(lesson.what_you_will_learn.length).toBeGreaterThan(2);
    expect(lesson.step_by_step_explanation.length).toBeGreaterThanOrEqual(4);
    expect(lesson.key_concepts.length).toBeGreaterThanOrEqual(3);
    expect(lesson.definitions.length).toBeGreaterThanOrEqual(2);
    expect(lesson.analogies.length).toBeGreaterThanOrEqual(1);
    expect(lesson.common_misconceptions.length).toBeGreaterThanOrEqual(2);
    expect(lesson.practice_questions.length).toBeGreaterThanOrEqual(3);
    expect(lesson.final_revision_sheet).toBeDefined();
  });

  it('generates an insightful pedagogical tutor response with analogy and Socratic check', () => {
    const response = generateDynamicTutorResponse({
      message: 'Why does air resistance increase when speed increases?',
      context: {
        label: 'Physics Chapter 3',
        content: 'Drag force is proportional to velocity squared in turbulent flow regimes.',
      },
    });

    expect(response).toContain('First-Principles Reason');
    expect(response).toContain('Context Applied');
    expect(response).toContain('Mental Model / Intuitive Analogy');
    expect(response).toContain('Quick Check For Understanding');
  });

  it('handles difference/comparison queries effectively in tutor', () => {
    const response = generateDynamicTutorResponse({
      message: 'What is the difference between mitosis and meiosis?',
    });

    expect(response).toContain('Conceptual Comparison');
    expect(response).toContain('Quick Rule of Thumb');
  });
});
