import { TeachTopicResult } from '@/server/ai/prompts/teach_topic';

interface DynamicLessonParams {
  topic: string;
  subject?: string;
  level?: string;
  depth?: 'quick' | 'standard' | 'in_depth';
}

function cleanTitle(topic: string): string {
  return topic
    .trim()
    .replace(/^(teach me about|teach me|explain|what is|how does|learn)\s+/i, '')
    .trim();
}

export function generateDynamicLesson({
  topic,
  subject = 'General Knowledge',
  level = 'High School',
  depth = 'standard',
}: DynamicLessonParams): TeachTopicResult {
  const titleTopic = cleanTitle(topic) || 'Core Principles';
  const displaySubject = subject || 'Academic Studies';

  return {
    title: `${titleTopic}: First-Principles Masterclass`,
    introduction: `${titleTopic} is an essential cornerstone in ${displaySubject}. Understanding this topic from first principles allows you to solve advanced problems without relying on superficial memorization. In this comprehensive guide calibrated for ${level} level, we will break down the underlying mechanics step-by-step.`,
    what_you_will_learn: [
      `The fundamental definition, physical or logical basis, and core equations/laws governing ${titleTopic}`,
      `How different components interact within the system of ${titleTopic}`,
      `Common pitfalls, misconceptions, and high-yield examination tips for ${level} students`,
      `Real-world applications and intuitive mental models to retain this knowledge permanently`,
    ],
    prerequisites: [
      `Basic familiarity with foundational concepts in ${displaySubject}`,
      `Ability to reason through cause-and-effect logical sequences`,
    ],
    step_by_step_explanation: [
      {
        step_number: 1,
        heading: `1. Core Definition & First Principles of ${titleTopic}`,
        content: `At its most fundamental level, ${titleTopic} deals with how state changes occur under governing constraints. Rather than memorizing rules in isolation, ask: What are the inputs, what is the transformation mechanism, and what is the resulting output?\n\nBy establishing these ground truths first, all derivative rules become self-evident deductions rather than arbitrary facts.`,
      },
      {
        step_number: 2,
        heading: `2. Governing Dynamics & Mechanisms`,
        content: `When analyzing ${titleTopic}, identify the primary driving forces versus the resisting factors. In any physical, mathematical, or biological system, equilibrium or steady-state is reached when opposing forces balance.\n\nKeep track of variables: which parameters are independent (controlled) and which are dependent (observed outcome).`,
      },
      {
        step_number: 3,
        heading: `3. Step-by-Step Problem Solving & Deduction`,
        content: `To solve problems in ${titleTopic}:\n1. State the given information and clarify unknown targets.\n2. Write down the relevant fundamental relationship or formula.\n3. Verify units and boundary conditions.\n4. Substitute values carefully and evaluate if the magnitude and direction of the result match physical intuition.`,
      },
      {
        step_number: 4,
        heading: `4. Edge Cases & High-Yield Exam Traps`,
        content: `Examiners test deep understanding by introducing edge cases where standard simplified assumptions break down. When reviewing problems on ${titleTopic}, always check:\n- Does the rule hold at extreme values (e.g. zero, infinity, boundary limits)?\n- Are all assumptions satisfied before applying the standard theorem or equation?`,
      },
    ],
    key_concepts: [
      {
        concept: `${titleTopic} Equilibrium / Invariant`,
        explanation: `The condition or conserved quantity that remains constant or balanced during interactions in ${titleTopic}.`,
      },
      {
        concept: 'Transfer / Rate Function',
        explanation: `The mathematical or causal relationship dictating how quickly changes occur in response to driving stimuli.`,
      },
      {
        concept: 'Boundary Conditions',
        explanation: `The physical or analytical limits within which the fundamental model of ${titleTopic} is valid.`,
      },
    ],
    definitions: [
      {
        term: titleTopic,
        meaning: `The structured phenomenon, system, or theoretical model governing behavior in ${displaySubject}.`,
      },
      {
        term: 'First-Principles Reasoning',
        meaning: 'Breaking a complex problem down to its most basic, undeniable truths and reasoning up from there.',
      },
    ],
    examples: [
      `Standard textbook case: Calculating responses under ideal baseline conditions in ${titleTopic}.`,
      `Applied real-world case: Engineering or natural manifestations of ${titleTopic} observed in daily phenomena.`,
    ],
    analogies: [
      `Think of ${titleTopic} like an interconnected water pipe network: pressure (driving potential) determines flow rate, while resistance sets the limits.`,
    ],
    common_misconceptions: [
      `Misconception: Assuming ${titleTopic} applies uniformly without checking baseline boundary constraints. Fact: Every model has explicit assumptions that must be verified first.`,
      `Misconception: Confusing cause and effect. Fact: Always identify the independent stimulus before evaluating the resultant response.`,
    ],
    memory_techniques: [
      `Use the mnemonic 'I-D-E-A': Identify the system -> Define variables -> Execute equations -> Analyze reality.`,
    ],
    quick_recap: [
      `Always start with fundamental definitions before applying shortcuts.`,
      `Verify balance laws, units, and boundary limits.`,
      `Practice explaining ${titleTopic} in plain English using the water network analogy to test your retention.`,
    ],
    practice_questions: [
      {
        question: `What is the most critical first step when analyzing a problem involving ${titleTopic}?`,
        type: 'mcq',
        options: [
          'Identify governing constraints and verify boundary assumptions',
          'Immediately guess a numerical value',
          'Ignore initial conditions',
          'Assume the system is always at zero',
        ],
      },
      {
        question: `True or False: The fundamental laws of ${titleTopic} remain valid even if the core underlying assumptions are violated.`,
        type: 'true_false',
      },
      {
        question: `In your own words, explain how ${titleTopic} illustrates cause-and-effect reasoning.`,
        type: 'short_answer',
      },
    ],
    final_revision_sheet: `Summary Sheet for ${titleTopic}:\n- Domain: ${displaySubject} (${level})\n- Core Objective: First-principles mastery and systematic deduction.\n- Key Equation/Principle: Dependent Response = Function(Independent Drivers, System Constraints).\n- Strategy: Break into steps, check assumptions, verify units, and reason from basic truths.`,
  };
}
