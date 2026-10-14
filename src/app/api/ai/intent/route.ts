import { NextResponse } from 'next/server';
import { generateStructured } from '@/server/ai/provider';
import { INTENT_SYSTEM_PROMPT, intentSchema } from '@/server/ai/prompts/intent';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    try {
      const intent = await generateStructured({
        prompt: `Input query: "${prompt}"`,
        systemInstruction: INTENT_SYSTEM_PROMPT,
        schema: intentSchema,
      });

      return NextResponse.json(intent);
    } catch {
      // Natural Language Classifier
      const clean = prompt.trim();
      const lower = clean.toLowerCase();

      let action: 'teach_topic' | 'explain_note' | 'generate_quiz' | 'ask_question' = 'teach_topic';
      let confidence = 0.88;

      if (/quiz|test|exam|practice|assess|test me|give me questions/i.test(lower)) {
        action = 'generate_quiz';
      } else if (/notes|uploaded|summary of note|my note|pdf|document|lecture/i.test(lower)) {
        action = 'explain_note';
      } else if (/why|who|when|solve|clarify|what is the difference|is it true/i.test(lower)) {
        action = 'ask_question';
      } else {
        action = 'teach_topic';
      }

      // Extract cleaned topic
      const topic = clean
        .replace(/^(quiz me on|test me on|give me a quiz on|practice|assess me on|teach me about|teach me|can you teach me|explain notes on|explain|what is|how does|i want to learn about|i want to learn)\s+/i, '')
        .replace(/[?!.]+$/, '')
        .trim();

      const explanationMap = {
        generate_quiz: `Starting an adaptive assessment on "${topic || 'your chosen subject'}".`,
        explain_note: `Looking up study notes and breakdowns for "${topic || 'uploaded material'}".`,
        ask_question: `Consulting your AI Tutor on "${topic || 'your question'}".`,
        teach_topic: `Building a beginner-friendly first-principles masterclass on "${topic || 'this topic'}".`,
      };

      return NextResponse.json({
        action,
        topic: topic || clean,
        confidence,
        explanation: explanationMap[action],
      });
    }
  } catch (err) {
    return NextResponse.json({
      action: 'teach_topic',
      topic: 'Core Concepts',
      confidence: 0.8,
      explanation: 'Building your personalized lesson.',
    });
  }
}
