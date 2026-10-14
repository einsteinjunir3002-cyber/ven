import { NextResponse } from 'next/server';
import { generateStructured } from '@/server/ai/provider';
import { z } from 'zod';
import { formatMathNotation } from '@/lib/math-format';

const robotResponseSchema = z.object({
  reply: z.string().describe('Friendly, concise spoken and written response to the student.'),
  action: z.object({
    type: z.enum(['navigate', 'start_quiz', 'timer', 'toggle_theme', 'scroll', 'none']),
    url: z.string().optional().describe('URL to navigate to (e.g., /practice, /learn, /library, /dashboard, /profile)'),
    subject: z.string().optional(),
    topic: z.string().optional(),
    minutes: z.number().optional(),
    direction: z.enum(['top', 'bottom']).optional(),
  }),
  spokenText: z.string().describe('Clear, spoken sentence for audio speech synthesis without markdown formatting or symbols.'),
});

export type RobotResponse = z.infer<typeof robotResponseSchema>;

const ROBOT_SYSTEM_PROMPT = `You are "CyberVen", a smart, friendly, high-tech robot study companion and autonomous site navigator for the Venessa Study learning platform.

Your capabilities:
1. AUTONOMOUS NAVIGATION: If the student asks to go somewhere, navigate, open a page, or review work, choose action.type = "navigate" with appropriate url:
   - Practice Quizzes: url = "/practice"
   - Mistakes Bank: url = "/practice/mistakes"
   - Learn Topics / Masterclasses: url = "/learn" (or "/learn?topic=TopicName" if specified)
   - Digital Notebook / Upload Materials / Library: url = "/library"
   - Dashboard / Overview: url = "/dashboard"
   - AI Tutor Chat: url = "/tutor"
   - Progress / Stats: url = "/progress"
   - Profile / Settings: url = "/profile"

2. AUTONOMOUS QUIZ LAUNCHER: If student says "quiz me on [topic]" or "give me a test on [topic]":
   - action.type = "start_quiz"
   - topic = extracted topic
   - subject = relevant subject (Mathematics, Physics, Chemistry, Biology, Computer Science, etc.)

3. STUDY TIMER: If student asks to set a timer:
   - action.type = "timer"
   - minutes = number of minutes (e.g. 15, 25, 45)

4. THEME TOGGLE: If student asks to toggle dark mode or change theme:
   - action.type = "toggle_theme"

5. ACADEMIC TUTORING & ASSISTANCE:
   - Answer academic and study questions thoroughly and helpfully.
   - For mathematical statements, write powers in superscript (n³, 3x², xⁿ, 10⁻³) and paper notation (never use caret ^).
   - For chemistry, write subscripts (H₂O, CO₂).
   - Set action.type = "none" if just answering a question.

Always produce:
- "reply": Markdown text formatted for visual reading with paper math notation.
- "spokenText": Natural voice script without raw markdown, symbols, or hashtags, suitable for Web Speech audio synthesis.
- "action": structured action command for autonomous execution.`;

export async function POST(request: Request) {
  try {
    const { message, currentPath } = await request.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();

    // 1. Try Gemini Structured Generation
    try {
      const prompt = `Student Message: "${trimmed}"\nCurrent Page: "${currentPath || '/'}"`;
      const aiResult = await generateStructured({
        prompt,
        systemInstruction: ROBOT_SYSTEM_PROMPT,
        schema: robotResponseSchema,
        temperature: 0.3,
      });

      return NextResponse.json({
        reply: formatMathNotation(aiResult.reply),
        action: aiResult.action,
        spokenText: aiResult.spokenText,
      });
    } catch {
      // 2. Intelligent autonomous fallback
      let actionType: 'navigate' | 'start_quiz' | 'timer' | 'toggle_theme' | 'scroll' | 'none' = 'none';
      let url: string | undefined = undefined;
      let topic: string | undefined = undefined;
      let subject: string | undefined = undefined;
      let minutes: number | undefined = undefined;
      let reply = '';
      let spokenText = '';

      if (/(?:take me to|navigate to|go to|open|show me)\s+(?:the\s+)?mistakes?/i.test(lower) || /my mistakes/i.test(lower)) {
        actionType = 'navigate';
        url = '/practice/mistakes';
        reply = "Navigating to your **Mistakes Bank** now! Let's turn past errors into solid understanding. ✍️";
        spokenText = "Navigating to your Mistakes Bank now. Let's turn past errors into solid understanding!";
      } else if (/(?:take me to|navigate to|go to|open)\s+(?:the\s+)?practice/i.test(lower) || /quiz mode/i.test(lower) || /practice quizzes/i.test(lower)) {
        actionType = 'navigate';
        url = '/practice';
        reply = "Taking you straight to **Practice Quizzes**! Pick a topic or start an adaptive session. 🚀";
        spokenText = "Taking you straight to Practice Quizzes. Pick a topic or start an adaptive session!";
      } else if (/(?:take me to|navigate to|go to|open)\s+(?:the\s+)?learn/i.test(lower) || /masterclass/i.test(lower)) {
        actionType = 'navigate';
        url = '/learn';
        reply = "Heading to **Learn Masterclasses**! You can explore first-principles breakdowns of any topic. 🎓";
        spokenText = "Heading to Learn Masterclasses. You can explore first principles breakdowns of any topic.";
      } else if (/(?:take me to|navigate to|go to|open)\s+(?:the\s+)?library/i.test(lower) || /my notes/i.test(lower) || /digital notebook/i.test(lower) || /uploaded materials/i.test(lower)) {
        actionType = 'navigate';
        url = '/library';
        reply = "Opening your **Digital Notebook & Library**! View your notes, slides, and syllabus documents. 📚";
        spokenText = "Opening your Digital Notebook and Library.";
      } else if (/(?:take me to|navigate to|go to|open)\s+(?:the\s+)?dashboard/i.test(lower) || /home/i.test(lower) || /overview/i.test(lower)) {
        actionType = 'navigate';
        url = '/dashboard';
        reply = "Heading over to your **Study Dashboard**! 📊";
        spokenText = "Heading over to your Study Dashboard.";
      } else if (/quiz me on\s+(.+)/i.test(lower) || /test me on\s+(.+)/i.test(lower)) {
        const match = lower.match(/(?:quiz|test) me on\s+(.+)/i);
        const extracted = match ? match[1].replace(/[?!.]+$/, '').trim() : 'General Science';
        actionType = 'start_quiz';
        topic = extracted.charAt(0).toUpperCase() + extracted.slice(1);
        subject = /calculus|math|algebra|geometry/i.test(topic) ? 'Mathematics' : /chem/i.test(topic) ? 'Chemistry' : /physics/i.test(topic) ? 'Physics' : 'General Science';
        reply = `Preparing an adaptive quiz on **${topic}** for you right now! Let's test your mastery. 📝`;
        spokenText = `Preparing an adaptive quiz on ${topic} for you right now!`;
      } else if (/timer\s+(?:for\s+)?(\d+)\s*(?:min|minute)/i.test(lower) || /set\s+(?:a\s+)?(\d+)\s*(?:min|minute)\s+timer/i.test(lower)) {
        const match = lower.match(/(\d+)\s*(?:min|minute)/i);
        minutes = match ? parseInt(match[1], 10) : 15;
        actionType = 'timer';
        reply = `Timer set! Starting a **${minutes}-minute focus study session** for you now. ⏱️ Stay in the zone!`;
        spokenText = `Timer set! Starting a ${minutes} minute focus study session for you now.`;
      } else if (/dark mode|light mode|toggle theme|change theme/i.test(lower)) {
        actionType = 'toggle_theme';
        reply = "Toggling interface theme for you! 🌙";
        spokenText = "Toggling interface theme for you!";
      } else if (/scroll to (?:the )?bottom/i.test(lower)) {
        actionType = 'scroll';
        reply = "Scrolling down to the bottom of the page! ⬇️";
        spokenText = "Scrolling down to the bottom of the page.";
      } else if (/scroll to (?:the )?top/i.test(lower)) {
        actionType = 'scroll';
        reply = "Scrolling up to the top! ⬆️";
        spokenText = "Scrolling up to the top.";
      } else {
        reply = `I'm **CyberVen**, your autonomous AI robot companion! 🤖\n\nI can:\n- **Fly & navigate** you anywhere (e.g., *"Take me to Practice"*, *"Open my mistakes"*, *"Show Library"*)\n- **Launch instant quizzes** (e.g., *"Quiz me on Calculus"*)\n- **Start focus timers** (e.g., *"Set a 20 min timer"*)\n- **Answer questions with speech & text** using paper math notation (e.g., *f'(x) = 6x + 5*)\n- **Toggle theme** (e.g., *"Switch to dark mode"*)\n\nWhat would you like to explore today?`;
        spokenText = "I am CyberVen, your autonomous AI robot companion! I can navigate you anywhere on the site, launch adaptive quizzes, start study timers, and answer your questions with voice and text. What would you like to explore today?";
      }

      return NextResponse.json({
        reply: formatMathNotation(reply),
        action: {
          type: actionType,
          url,
          topic,
          subject,
          minutes,
        },
        spokenText,
      });
    }
  } catch (err) {
    return NextResponse.json({
      reply: "Hello! I am CyberVen, your robot study assistant. How can I help you navigate or study right now?",
      action: { type: 'none' },
      spokenText: "Hello! I am CyberVen, your robot study assistant. How can I help you today?",
    });
  }
}
