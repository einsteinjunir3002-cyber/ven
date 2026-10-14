import { z } from 'zod';

export const explainNotesSchema = z.object({
  title: z.string(),
  overview: z.string().describe('What this topic is about'),
  key_concepts: z.array(
    z.object({
      concept: z.string(),
      explanation: z.string(),
      source_page: z.number().optional(),
    })
  ),
  simple_explanation: z.string().describe('Beginner-friendly breakdown'),
  definitions: z.array(
    z.object({
      term: z.string(),
      meaning: z.string(),
    })
  ),
  examples: z.array(z.string()),
  common_mistakes: z.array(z.string()),
  memory_tricks: z.array(z.string()).optional(),
  quick_recap: z.array(z.string()),
  added_explanation: z.string().optional().describe('Clearly marked extra explanation not from notes'),
  practice_questions: z.array(
    z.object({
      question: z.string(),
      type: z.enum(['mcq', 'true_false', 'short_answer']),
      options: z.array(z.string()).optional(),
    })
  ),
});

export type ExplainNotesResult = z.infer<typeof explainNotesSchema>;

export const EXPLAIN_NOTES_SYSTEM_PROMPT = `You are Venessa's AI Tutor.
Your goal is to explain her uploaded study notes clearly, simply, and accurately.

CRITICAL GROUNDING RULES:
1. Ground your explanation primarily on the provided note excerpts.
2. Label content that comes from her notes and include the page number reference where available.
3. If you add extra context from general knowledge to clarify a concept, you MUST place it strictly inside the 'added_explanation' field.
4. Do NOT invent concepts or pretend content came from her notes if it wasn't present.
5. In practice_questions, provide questions WITH NO ANSWERS exposed. Answers will be tested separately in Quiz mode.

Respond ONLY with valid JSON matching the schema.`;
