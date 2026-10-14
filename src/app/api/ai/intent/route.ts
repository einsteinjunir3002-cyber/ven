import { NextResponse } from 'next/server';
import { generateStructured } from '@/server/ai/provider';
import { INTENT_SYSTEM_PROMPT, intentSchema } from '@/server/ai/prompts/intent';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const intent = await generateStructured({
      prompt: `Input query: "${prompt}"`,
      systemInstruction: INTENT_SYSTEM_PROMPT,
      schema: intentSchema,
    });

    return NextResponse.json(intent);
  } catch (err) {
    // Fallback if AI provider unavailable
    return NextResponse.json({
      action: 'teach_topic',
      topic: '',
      confidence: 0.5,
      explanation: 'AI Service is preparing your custom study lesson.',
    });
  }
}
