import { NextResponse } from 'next/server';
import { generateStream } from '@/server/ai/provider';
import { TUTOR_SYSTEM_PROMPT } from '@/server/ai/prompts/tutor';
import { generateDynamicTutorResponse } from '@/server/ai/generators/dynamic_tutor';

export async function POST(request: Request) {
  try {
    const { message, context, isExam } = await request.json();

    if (isExam) {
      return NextResponse.json({
        answer: '🔒 **Tutor Disabled During Exam Mode.**\n\nAI assistance is turned off during an active exam to ensure valid testing scores.',
      });
    }

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let fullPrompt = message;
    if (context) {
      fullPrompt = `[Attached Context - ${context.type}: ${context.label}]\nContent: ${context.content || ''}\n\nUser Question: ${message}`;
    }

    try {
      let fullAnswer = '';
      await generateStream({
        prompt: fullPrompt,
        systemInstruction: TUTOR_SYSTEM_PROMPT,
        onChunk: (chunk) => {
          fullAnswer += chunk;
        },
      });

      if (fullAnswer.trim()) {
        return NextResponse.json({ answer: fullAnswer });
      }
    } catch {
      // Intelligent pedagogical fallback when AI provider is unconfigured
    }

    const answer = generateDynamicTutorResponse({ message, context });
    return NextResponse.json({ answer });
  } catch (err) {
    const answer = generateDynamicTutorResponse({ message: 'Study assistance question' });
    return NextResponse.json({ answer });
  }
}
