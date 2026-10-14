import { z } from 'zod';

export const intentSchema = z.object({
  action: z.enum(['teach_topic', 'explain_note', 'generate_quiz', 'ask_question']),
  topic: z.string().describe('Extracted topic or subject query'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0 to 1'),
  explanation: z.string().describe('Brief 1-sentence friendly confirmation of what AI understood'),
});

export type IntentResult = z.infer<typeof intentSchema>;

export const INTENT_SYSTEM_PROMPT = `You are Venessa's AI Study Companion.
Analyze the user's input and classify their intent into one of four categories:
1. teach_topic: Wants a comprehensive beginner-friendly lesson on a topic.
2. explain_note: Wants an explanation or breakdown of uploaded notes or study material.
3. generate_quiz: Wants to take a quiz or test their knowledge.
4. ask_question: Has a specific quick question or concept clarification.

Respond ONLY with JSON matching the provided schema.`;
