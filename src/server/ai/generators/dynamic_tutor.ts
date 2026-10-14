import { formatMathNotation } from '@/lib/math-format';

interface TutorContext {
  type?: string;
  label?: string;
  content?: string;
}

interface DynamicTutorParams {
  message: string;
  context?: TutorContext;
}

export function generateDynamicTutorResponse({ message, context }: DynamicTutorParams): string {
  const cleanMsg = message.trim();
  const contextSubject = context?.label || 'your study material';
  const hasContext = Boolean(context?.content);

  // Identify question intent
  const isWhy = /why|how come|reason/i.test(cleanMsg);
  const isHow = /how do|how does|how can|steps|procedure|solve/i.test(cleanMsg);
  const isWhat = /what is|define|definition|meaning|explain/i.test(cleanMsg);
  const isDifference = /difference between|compare|contrast|versus|vs/i.test(cleanMsg);

  let explanation = '';

  if (isDifference) {
    explanation = `### ⚖️ Conceptual Comparison\n\nWhen contrasting these concepts, the clearest distinction lies in their **underlying mechanisms** and **functional roles**:\n\n1. **Primary Distinctions**: Focus on what triggers each process and where the boundary conditions differ.\n2. **Common Trap**: Students often confuse them because they occur in sequence or share similar terminology.\n3. **Quick Rule of Thumb**: Remember which one acts as the *cause/driver* versus which one is the *effect/result*.`;
  } else if (isWhy) {
    explanation = `### 💡 Why This Happens (First-Principles Reason)\n\nTo understand *why*, we have to examine the governing principle behind it:\n\n- **The Root Cause**: Systems always move toward equilibrium, conservation, or lowest energy states unless external work or driving force is applied.\n- **The Direct Consequence**: When this constraint is met, the observed behavior occurs naturally as a logical necessity rather than a random rule.`;
  } else if (isHow) {
    explanation = `### 🛠️ Step-by-Step Breakdown\n\nHere is how to approach this systematically:\n\n1. **Identify the Given State**: Note the known parameters and boundary conditions.\n2. **Apply the Governing Rule/Equation**: Connect the inputs to the required output using the fundamental relationship.\n3. **Execute & Sanity Check**: Check the units, direction, and magnitude to make sure the result makes sense in reality.`;
  } else if (isWhat) {
    explanation = `### 📖 Core Definition & Meaning\n\nAt its heart, this concept represents the relationship between inputs and outputs in a structured system:\n\n- **Plain English**: Think of it as a rule that determines how one quantity changes in response to another.\n- **Pedagogical Meaning**: Rather than memorizing the jargon, visualize the physical or logical situation taking place.`;
  } else {
    explanation = `### 🧠 Conceptual Analysis\n\nGreat question! Let's examine this clearly from the ground up:\n\n- **Key Principle**: Every complex topic is simply a combination of elementary cause-and-effect relationships.\n- **Observation**: When you break down your question into its core components, the logic becomes clear.`;
  }

  const contextSection = hasContext
    ? `\n\n> **Context Applied (${contextSubject})**:\n> *${context?.content?.slice(0, 300)}...*\n`
    : '';

  const analogy = `\n\n### 🌊 Mental Model / Intuitive Analogy\nThink of this like a traffic flow system: capacity (potential) determines how many vehicles can move, while bottlenecks (resistance) govern the actual rate of progress. Adjusting either side immediately shifts the outcome.`;

  const socraticCheck = `\n\n---\n**Quick Check For Understanding:**\nBased on this explanation, if we were to double the primary driving factor while keeping all other variables constant, what do you predict would happen to the final output? *(Try answering in your own words!)*`;

  return formatMathNotation(`${explanation}${contextSection}${analogy}${socraticCheck}`);
}

