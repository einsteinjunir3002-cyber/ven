import { z } from 'zod';

export const generatedQuestionSchema = z.object({
  type: z.enum(['mcq', 'true_false', 'short_answer', 'fill_blank']),
  prompt: z.string().describe('Clear, unambiguous question prompt assessing the topic'),
  options: z.array(z.string()).optional().describe('4 distinct options for MCQ'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  subject: z.string().optional(),
  topic: z.string().optional(),
  concept: z.string().optional().describe('Specific concept or subtopic tag for mastery tracking'),
  source_page: z.number().optional(),

  // RESTRICTED Answer Key Data (stored ONLY in question_answer_keys / server)
  correct_option: z.number().min(0).max(3).optional().describe('0-indexed correct option for MCQ'),
  correct_bool: z.boolean().optional().describe('Correct boolean for True/False'),
  accepted_answers: z.array(z.string()).optional().describe('List of accepted string variants for fill_blank'),
  rubric: z.object({
    key_points: z.array(
      z.object({
        point: z.string().describe('Criterion or essential concept component'),
        weight: z.number().describe('Marks allocated to this point'),
      })
    ),
    sample_answer: z.string().describe('Full exemplary model answer'),
  }).optional().describe('Rubric for short answer marking'),
  explanation: z.string().describe('In-depth, step-by-step pedagogical explanation of why this answer is correct and why common mistakes occur'),
  remember_tip: z.string().describe('Practical mnemonic, mental model, or memory rule of thumb'),
});

export const quizGenResponseSchema = z.object({
  title: z.string(),
  subject: z.string().optional(),
  topic: z.string().optional(),
  questions: z.array(generatedQuestionSchema),
});

export type QuizGenResponse = z.infer<typeof quizGenResponseSchema>;

export const QUIZ_GEN_SYSTEM_PROMPT = `You are a world-class academic examiner and assessment designer.
Generate high-quality, pedagogically rigorous questions tailored precisely to the specified Subject, Topic, Academic Level, and Question Types.

CRITICAL RULES:
1. SUBJECT & TOPIC FIDELITY: Every question must directly test the specified subject and topic. Do not deviate to generic trivia.
2. PEDAGOGICAL DEPTH: Questions must assess genuine conceptual understanding, application, or problem solving, matching the requested academic level.
3. FOR MULTIPLE CHOICE (MCQ):
   - Provide EXACTLY 4 distinct, plausible options.
   - Only 1 option must be correct (0-indexed in correct_option).
   - Distractors must represent plausible student misconceptions, not absurd choices.
4. FOR TRUE/FALSE:
   - Provide a nuanced, thought-provoking statement that tests conceptual boundaries.
   - Set correct_bool accurately.
5. FOR SHORT ANSWER:
   - Formulate a clear prompt that invites structured explanation.
   - Provide a weighted rubric breakdown (key points whose weights sum to total marks).
   - Provide a complete, articulate sample_answer.
6. FOR FILL IN THE BLANK:
   - Provide a clear sentence with a missing key term.
   - Provide multiple accepted variants (spelling, synonyms) in accepted_answers.
7. ACCURATE EXPLANATIONS (MANDATORY):
   - For every question, write a comprehensive, clear 'explanation' explaining WHY the correct answer is true, the step-by-step reasoning, and why other options are incorrect.
   - Provide a clever 'remember_tip' (mnemonic, analogy, or takeaway) for revision.

Respond ONLY with valid JSON matching the schema.`;

