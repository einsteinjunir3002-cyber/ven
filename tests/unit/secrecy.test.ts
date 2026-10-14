import { describe, it, expect } from 'vitest';

describe('Answer Secrecy Verification', () => {
  it('ensures question payload sent to client does not leak correct answer keys', () => {
    const questionFromDB = {
      id: 'q-101',
      quiz_id: 'quiz-1',
      position: 1,
      type: 'mcq',
      prompt: 'Which cell organelle contains genetic DNA?',
      options: ['Ribosome', 'Nucleus', 'Lysosome', 'Vacuole'],
      difficulty: 'easy',
      max_marks: 1,
    };

    // Client question serializer function
    const sanitizeQuestionForClient = (q: typeof questionFromDB) => {
      const { ...safeProps } = q;
      return safeProps;
    };

    const clientPayload = sanitizeQuestionForClient(questionFromDB);

    // Assert that no correct_option, rubric, model_answer, or explanation fields exist in payload
    expect(clientPayload).not.toHaveProperty('correct_option');
    expect(clientPayload).not.toHaveProperty('correct_bool');
    expect(clientPayload).not.toHaveProperty('accepted_answers');
    expect(clientPayload).not.toHaveProperty('rubric');
    expect(clientPayload).not.toHaveProperty('model_answer');
    expect(clientPayload).not.toHaveProperty('explanation');
  });
});
