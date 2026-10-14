import { z } from 'zod';

export const teachTopicSchema = z.object({
  title: z.string(),
  introduction: z.string(),
  what_you_will_learn: z.array(z.string()),
  prerequisites: z.array(z.string()),
  step_by_step_explanation: z.array(
    z.object({
      step_number: z.number(),
      heading: z.string(),
      content: z.string(),
    })
  ),
  key_concepts: z.array(
    z.object({
      concept: z.string(),
      explanation: z.string(),
    })
  ),
  definitions: z.array(
    z.object({
      term: z.string(),
      meaning: z.string(),
    })
  ),
  examples: z.array(z.string()),
  analogies: z.array(z.string()),
  common_misconceptions: z.array(z.string()),
  memory_techniques: z.array(z.string()),
  quick_recap: z.array(z.string()),
  practice_questions: z.array(
    z.object({
      question: z.string(),
      type: z.enum(['mcq', 'true_false', 'short_answer']),
      options: z.array(z.string()).optional(),
    })
  ),
  final_revision_sheet: z.string().describe('Concise summary sheet for quick exam revision'),
});

export type TeachTopicResult = z.infer<typeof teachTopicSchema>;

export const TEACH_TOPIC_SYSTEM_PROMPT = `You are Venessa's AI Tutor.
Teach any given topic starting from first principles for a complete beginner. Never assume prior advanced knowledge.

Rules:
1. Explain step-by-step with analogies and simple language.
2. If no specific school curriculum is provided, do NOT claim it matches her official school curriculum. State clearly that it is a general masterclass lesson.
3. If uncertain about a factual detail, state uncertainty clearly rather than fabricating stats or citations.
4. Keep practice questions without answers revealed in this view.

Respond ONLY with valid JSON matching the schema.`;
