import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createAdminClient, DEFAULT_GUEST_USER_ID } from '@/lib/supabase/admin';
import { generateStructured } from '@/server/ai/provider';
import { QUIZ_GEN_SYSTEM_PROMPT, quizGenResponseSchema, QuizGenResponse } from '@/server/ai/prompts/quiz_gen';
import { generateDynamicQuestions } from '@/server/ai/generators/dynamic_questions';
import { formatMathNotation, formatMathObject } from '@/lib/math-format';
import {
  quizStore,
  StoredQuestion,
  StoredAnswerKey,
  StoredQuiz,
  StoredAttempt,
} from '@/server/quiz-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawUserId = body.userId;
    const userId = (!rawUserId || rawUserId === '00000000-0000-0000-0000-000000000000')
      ? DEFAULT_GUEST_USER_ID
      : rawUserId;
    const {
      sourceType = 'topic',
      subject = 'General Science',
      topic = 'Fundamentals',
      level = 'High School',
      count = 5,
      difficulty = 'mixed',
      types = 'mixed',
      isExam = false,
      contextNotes = '',
    } = body;

    const requestedCount = Math.min(Math.max(Number(count) || 5, 1), 20);

    let generated: QuizGenResponse;

    try {
      const promptText = `Generate a ${requestedCount}-question academic assessment for:
Subject: "${subject}"
Topic: "${topic}"
Academic Level: "${level}"
Difficulty: "${difficulty}"
Question Types: "${types}"
${contextNotes ? `Reference Notes/Context:\n"""\n${contextNotes.slice(0, 3000)}\n"""` : ''}

Ensure each question has a clear, comprehensive pedagogical explanation explaining WHY the answer is correct and why other choices are wrong, along with a mnemonic/remember tip.`;

      generated = await generateStructured({
        prompt: promptText,
        systemInstruction: QUIZ_GEN_SYSTEM_PROMPT,
        schema: quizGenResponseSchema,
      });
    } catch (aiErr) {
      console.warn('Gemini quiz generation fallback triggered:', (aiErr as Error).message);
      // Dynamic fallback tailored specifically to subject and topic
      generated = generateDynamicQuestions({
        subject,
        topic,
        count: requestedCount,
        difficulty: difficulty as 'easy' | 'medium' | 'hard' | 'mixed',
        types: types as 'mcq' | 'true_false' | 'short_answer' | 'fill_blank' | 'mixed',
        level,
        contextNotes,
      });
    }

    // Apply human paper mathematical formatting across all generated content
    generated = formatMathObject(generated);

    const quizId = randomUUID();
    const quizTitle = formatMathNotation(generated.title || `${subject}: ${topic}`);
    const quizSubject = generated.subject || subject;
    const quizTopic = generated.topic || topic;

    // Build questions and answer keys
    const storedQuestions: StoredQuestion[] = [];
    const storedAnswerKeys: StoredAnswerKey[] = [];
    const safeQuestionsForClient: Array<Omit<StoredQuestion, never>> = [];

    for (let i = 0; i < generated.questions.length; i++) {
      const q = generated.questions[i];
      const qId = randomUUID();
      const position = i + 1;
      const maxMarks = q.type === 'short_answer' ? 2 : 1;

      const questionObj: StoredQuestion = {
        id: qId,
        quiz_id: quizId,
        position,
        type: q.type,
        prompt: formatMathNotation(q.prompt),
        options: q.options ? q.options.map((opt) => formatMathNotation(opt)) : null,
        subject: q.subject || quizSubject,
        topic: q.topic || quizTopic,
        concept: q.concept || topic,
        difficulty: q.difficulty || 'medium',
        max_marks: maxMarks,
      };

      const keyObj: StoredAnswerKey = {
        question_id: qId,
        quiz_id: quizId,
        correct_option: q.correct_option ?? null,
        correct_bool: q.correct_bool ?? null,
        accepted_answers: (q.accepted_answers || []).map((ans) => formatMathNotation(ans)),
        rubric: q.rubric ? formatMathObject(q.rubric) : null,
        model_answer: q.rubric?.sample_answer ? formatMathNotation(q.rubric.sample_answer) : null,
        explanation: formatMathNotation(q.explanation || 'Detailed step-by-step breakdown of why this answer is correct.'),
        remember_tip: formatMathNotation(q.remember_tip || 'Key takeaway for revision.'),
      };

      storedQuestions.push(questionObj);
      storedAnswerKeys.push(keyObj);

      // Safe copy for client response (strictly without answer keys or explanations)
      safeQuestionsForClient.push({ ...questionObj });
    }

    const durationSeconds = isExam ? storedQuestions.length * 90 : null; // 90s per question in exam
    const deadline = durationSeconds ? new Date(Date.now() + durationSeconds * 1000).toISOString() : null;

    const quizRecord: StoredQuiz = {
      id: quizId,
      user_id: userId,
      title: quizTitle,
      source_type: sourceType,
      subject: quizSubject,
      topic: quizTopic,
      question_count: storedQuestions.length,
      settings: { difficulty, types, isExam, level },
      created_at: new Date().toISOString(),
    };

    const attemptId = randomUUID();
    const attemptRecord: StoredAttempt = {
      id: attemptId,
      user_id: userId,
      quiz_id: quizId,
      mode: isExam ? 'exam' : 'practice',
      status: 'in_progress',
      started_at: new Date().toISOString(),
      deadline,
      duration_seconds: durationSeconds,
    };

    // 1. Save in server quiz store (always succeeds, resilient)
    quizStore.createQuiz(quizRecord);
    quizStore.saveQuestions(quizId, storedQuestions, storedAnswerKeys);
    quizStore.createAttempt(attemptRecord);

    // 2. Best-effort sync to Supabase if configured
    try {
      const supabaseAdmin = createAdminClient();
      const { data: dbQuiz, error: quizErr } = await supabaseAdmin
        .from('quizzes')
        .insert({
          id: quizId,
          user_id: userId,
          title: quizTitle,
          source_type: sourceType,
          subject: quizSubject,
          topic: quizTopic,
          question_count: storedQuestions.length,
          settings: { difficulty, types, isExam, level },
        })
        .select()
        .single();

      if (quizErr) {
        console.error('Supabase quiz insert error:', quizErr);
      } else if (dbQuiz) {
        for (let i = 0; i < storedQuestions.length; i++) {
          const q = storedQuestions[i];
          const k = storedAnswerKeys[i];

          const { error: qErr } = await supabaseAdmin.from('questions').insert({
            id: q.id,
            quiz_id: quizId,
            user_id: userId,
            position: q.position,
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            subject: q.subject,
            topic: q.topic,
            concept: q.concept,
            difficulty: q.difficulty,
            max_marks: q.max_marks,
          });
          if (qErr) console.error('Supabase question insert error:', qErr);

          const { error: kErr } = await supabaseAdmin.from('question_answer_keys').insert({
            question_id: q.id,
            quiz_id: quizId,
            user_id: userId,
            correct_option: k.correct_option,
            correct_bool: k.correct_bool,
            accepted_answers: k.accepted_answers,
            rubric: k.rubric,
            explanation: k.explanation,
            remember_tip: k.remember_tip,
          });
          if (kErr) console.error('Supabase answer key insert error:', kErr);
        }

        const { error: attErr } = await supabaseAdmin.from('attempts').insert({
          id: attemptId,
          user_id: userId,
          quiz_id: quizId,
          mode: isExam ? 'exam' : 'practice',
          status: 'in_progress',
          started_at: attemptRecord.started_at,
          deadline,
          duration_seconds: durationSeconds,
        });
        if (attErr) console.error('Supabase attempt insert error:', attErr);
      }
    } catch (err) {
      console.error('Supabase persistence error in quiz generation:', err);
    }

    return NextResponse.json({
      quiz: quizRecord,
      attempt: attemptRecord,
      questions: safeQuestionsForClient,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
