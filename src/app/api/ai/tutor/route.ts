import { NextResponse } from 'next/server';
import { generateStream } from '@/server/ai/provider';
import { TUTOR_SYSTEM_PROMPT } from '@/server/ai/prompts/tutor';

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

    let fullAnswer = '';
    await generateStream({
      prompt: fullPrompt,
      systemInstruction: TUTOR_SYSTEM_PROMPT,
      onChunk: (chunk) => {
        fullAnswer += chunk;
      },
    });

    return NextResponse.json({ answer: fullAnswer || 'I am ready to help you understand your notes!' });
  } catch (err) {
    // Fallback response if API key is not configured in dev
    return NextResponse.json({
      answer: 'I am your AI study tutor! When you ask about your notes, I will break down key concepts into simple language and provide real-world examples.',
    });
  }
}
