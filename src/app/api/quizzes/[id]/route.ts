import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { quizStore } from '@/server/quiz-store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Quiz ID or Attempt ID required' }, { status: 400 });
    }

    // Check if id is an attempt id or quiz id
    let attempt = quizStore.getAttempt(id);
    let quiz = attempt ? quizStore.getQuiz(attempt.quiz_id) : quizStore.getQuiz(id);

    if (!attempt && quiz) {
      attempt = quizStore.getAttemptByQuizId(quiz.id);
    }

    let questions = quiz ? quizStore.getQuestions(quiz.id) : [];
    let storedAnswers = attempt ? quizStore.getAttemptAnswers(attempt.id) : [];

    // Fallback: Check Supabase if not in memory
    if (!quiz || !attempt) {
      try {
        const supabase = createAdminClient();

        // Check if id is attempt id
        const { data: dbAttempt } = await supabase
          .from('attempts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (dbAttempt) {
          attempt = dbAttempt;
          const { data: dbQuiz } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', dbAttempt.quiz_id)
            .single();
          quiz = dbQuiz;
        } else {
          // Check if id is quiz id
          const { data: dbQuiz } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (dbQuiz) {
            quiz = dbQuiz;
            const { data: dbAtt } = await supabase
              .from('attempts')
              .select('*')
              .eq('quiz_id', id)
              .order('started_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            attempt = dbAtt;
          }
        }

        if (quiz) {
          const { data: dbQuestions } = await supabase
            .from('questions')
            .select('id, quiz_id, position, type, prompt, options, subject, topic, concept, difficulty, max_marks')
            .eq('quiz_id', quiz.id)
            .order('position', { ascending: true });

          if (dbQuestions) {
            questions = dbQuestions;
          }

          if (attempt?.status === 'marked') {
            const { data: dbAns } = await supabase
              .from('attempt_answers')
              .select('*')
              .eq('attempt_id', attempt.id);
            if (dbAns) storedAnswers = dbAns;
          }
        }
      } catch {
        // Supabase offline/unconfigured
      }
    }

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Sanitize questions for secrecy: ensure no answers or keys leak
    const safeQuestions = questions.map((q) => ({
      id: q.id,
      quiz_id: q.quiz_id,
      position: q.position,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      subject: q.subject,
      topic: q.topic,
      concept: q.concept,
      difficulty: q.difficulty,
      max_marks: q.max_marks,
    }));

    return NextResponse.json({
      quiz,
      attempt,
      questions: safeQuestions,
      answers: storedAnswers.length > 0 ? storedAnswers : undefined,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
