import { NextResponse } from 'next/server';
import { generateStructured } from '@/server/ai/provider';
import { EXPLAIN_NOTES_SYSTEM_PROMPT, explainNotesSchema } from '@/server/ai/prompts/explain_notes';
import { TEACH_TOPIC_SYSTEM_PROMPT, teachTopicSchema } from '@/server/ai/prompts/teach_topic';
import { generateDynamicLesson } from '@/server/ai/generators/dynamic_lessons';

export async function POST(request: Request) {
  try {
    const { kind, topic, materialId, level = 'High School', depth = 'standard', subject } = await request.json();

    if (kind === 'notes') {
      try {
        const lesson = await generateStructured({
          prompt: `Explain the uploaded study notes for material ID: ${materialId || 'current'}. Topic: ${topic || 'Main Concepts'}`,
          systemInstruction: EXPLAIN_NOTES_SYSTEM_PROMPT,
          schema: explainNotesSchema,
        });
        return NextResponse.json({ kind: 'notes', lesson });
      } catch {
        const lesson = generateDynamicLesson({
          topic: topic || 'Study Notes Analysis',
          subject: subject || 'Uploaded Study Notes',
          level,
          depth,
        });
        return NextResponse.json({ kind: 'notes', lesson });
      }
    } else {
      try {
        const lesson = await generateStructured({
          prompt: `Teach the topic "${topic || 'General Science'}" from first principles for a beginner. Education level: ${level}. Depth: ${depth}.`,
          systemInstruction: TEACH_TOPIC_SYSTEM_PROMPT,
          schema: teachTopicSchema,
        });
        return NextResponse.json({ kind: 'topic', lesson });
      } catch {
        const lesson = generateDynamicLesson({
          topic: topic || 'Foundational Principles',
          subject: subject || 'Science and Mathematics',
          level,
          depth,
        });
        return NextResponse.json({ kind: 'topic', lesson });
      }
    }
  } catch (err) {
    const lesson = generateDynamicLesson({
      topic: 'Core Concepts',
      subject: 'Foundational Knowledge',
      level: 'High School',
      depth: 'standard',
    });
    return NextResponse.json({ kind: 'topic', lesson });
  }
}
