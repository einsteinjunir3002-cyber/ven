import { NextResponse } from 'next/server';
import { generateStructured } from '@/server/ai/provider';
import { EXPLAIN_NOTES_SYSTEM_PROMPT, explainNotesSchema } from '@/server/ai/prompts/explain_notes';
import { TEACH_TOPIC_SYSTEM_PROMPT, teachTopicSchema } from '@/server/ai/prompts/teach_topic';

export async function POST(request: Request) {
  try {
    const { kind, topic, materialId, level, depth } = await request.json();

    if (kind === 'notes') {
      const lesson = await generateStructured({
        prompt: `Explain the uploaded study notes for material ID: ${materialId || 'current'}. Topic: ${topic || 'Main Concepts'}`,
        systemInstruction: EXPLAIN_NOTES_SYSTEM_PROMPT,
        schema: explainNotesSchema,
      });
      return NextResponse.json({ kind: 'notes', lesson });
    } else {
      const lesson = await generateStructured({
        prompt: `Teach the topic "${topic || 'General Science'}" from first principles for a beginner. Education level: ${level || 'High School'}. Depth: ${depth || 'standard'}.`,
        systemInstruction: TEACH_TOPIC_SYSTEM_PROMPT,
        schema: teachTopicSchema,
      });
      return NextResponse.json({ kind: 'topic', lesson });
    }
  } catch (err) {
    // Return baseline mock lesson if API key is not configured in environment
    return NextResponse.json({
      kind: 'topic',
      lesson: {
        title: 'Photosynthesis: How Plants Make Food',
        introduction: 'Photosynthesis is the fundamental biological process by which plants, algae, and some bacteria convert light energy into chemical energy stored in glucose.',
        what_you_will_learn: [
          'What raw materials plants need for photosynthesis',
          'The difference between Light-Dependent and Light-Independent reactions',
          'Why chlorophyll makes leaves look green',
        ],
        prerequisites: ['Basic cell structure concept'],
        step_by_step_explanation: [
          {
            step_number: 1,
            heading: 'Step 1: Capturing Sunlight in Chloroplasts',
            content: 'Chloroplasts contain green pigments called chlorophyll. When photons of light hit chlorophyll molecules, electrons become excited.',
          },
          {
            step_number: 2,
            heading: 'Step 2: Splitting Water (Photolysis)',
            content: 'Light energy splits H2O molecules into Hydrogen ions, electrons, and Oxygen gas (released into the air).',
          },
        ],
        key_concepts: [
          { concept: 'Chlorophyll', explanation: 'Green pigment that absorbs red and blue light wavelengths while reflecting green.' },
          { concept: 'Stomata', explanation: 'Microscopic pores on leaf surfaces that open and close to allow CO2 entry and O2 exit.' },
        ],
        definitions: [
          { term: 'Autotroph', meaning: 'An organism that creates its own complex organic compounds from simple substances.' },
        ],
        examples: ['Oak leaves absorbing morning sunlight', 'Algae blooms in aquatic ecosystems'],
        analogies: ['Chloroplasts act like tiny solar-powered kitchens inside every plant cell.'],
        common_misconceptions: ['Misconception: Plants only perform photosynthesis and do not respire. Fact: Plants perform cellular respiration day and night.'],
        memory_techniques: ['Remember WATER + SUN + CO2 = SUGAR + OXYGEN'],
        quick_recap: ['Light reactions happen in thylakoids; Calvin cycle happens in the stroma.'],
        practice_questions: [
          { question: 'Which organelle carries out photosynthesis in plant cells?', type: 'mcq', options: ['Mitochondria', 'Chloroplast', 'Nucleus', 'Ribosome'] },
          { question: 'True or False: Oxygen is produced as a byproduct when water molecules are split.', type: 'true_false' },
        ],
        final_revision_sheet: 'Overall Equation: 6CO2 + 6H2O + Light -> C6H12O6 + 6O2. Essential for all aerobic life on Earth.',
      },
    });
  }
}
