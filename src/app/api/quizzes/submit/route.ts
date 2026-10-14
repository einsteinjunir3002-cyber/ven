import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createAdminClient, DEFAULT_GUEST_USER_ID } from '@/lib/supabase/admin';
import { generateStructured } from '@/server/ai/provider';
import { MARKING_SYSTEM_PROMPT, markingResultSchema, MarkingResult } from '@/server/ai/prompts/marking';
import { quizStore, StoredAttemptAnswer } from '@/server/quiz-store';
import { formatMathNotation } from '@/lib/math-format';

interface SubmittedAnswerInput {
  questionId: string;
  answer: unknown;
  flagged?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attemptId, answers } = body;
    const rawUserId = body.userId;
    const userId = (!rawUserId || rawUserId === '00000000-0000-0000-0000-000000000000')
      ? DEFAULT_GUEST_USER_ID
      : rawUserId;

    if (!attemptId || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing attemptId or answers array' }, { status: 400 });
    }

    // 1. Fetch Attempt & Quiz from Store or Supabase
    let attempt = quizStore.getAttempt(attemptId);
    let quiz = attempt ? quizStore.getQuiz(attempt.quiz_id) : undefined;
    let questions = quiz ? quizStore.getQuestions(quiz.id) : [];
    let answerKeys = quiz ? quizStore.getAnswerKeys(quiz.id) : [];

    // Fallback: Check Supabase if not found in memory
    if (!attempt || questions.length === 0) {
      try {
        const supabaseAdmin = createAdminClient();
        const { data: dbAttempt } = await supabaseAdmin.from('attempts').select('*').eq('id', attemptId).maybeSingle();
        if (dbAttempt) {
          attempt = dbAttempt;
          const { data: dbQuiz } = await supabaseAdmin.from('quizzes').select('*').eq('id', dbAttempt.quiz_id).single();
          quiz = dbQuiz;

          const { data: dbQuestions } = await supabaseAdmin
            .from('questions')
            .select('*')
            .eq('quiz_id', dbAttempt.quiz_id)
            .order('position');
          if (dbQuestions) questions = dbQuestions;

          const { data: dbKeys } = await supabaseAdmin
            .from('question_answer_keys')
            .select('*')
            .eq('quiz_id', dbAttempt.quiz_id);
          if (dbKeys) answerKeys = dbKeys;
        }
      } catch {
        // Supabase unconfigured
      }
    }

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Idempotency: If already marked, return saved results
    if (attempt.status === 'marked') {
      const existingAnswers = quizStore.getAttemptAnswers(attemptId);
      const scorePct = attempt.max_score && attempt.max_score > 0
        ? Math.round(((attempt.score || 0) / attempt.max_score) * 100)
        : 0;

      return NextResponse.json({
        attempt,
        scorePercentage: scorePct,
        answers: existingAnswers,
      });
    }

    const keysMap = new Map((answerKeys || []).map((k) => [k.question_id, k]));
    const submittedMap = new Map<string, SubmittedAnswerInput>(
      answers.map((a: SubmittedAnswerInput) => [a.questionId, a])
    );

    let totalAwarded = 0;
    let totalMax = 0;
    let correctCount = 0;
    let partialCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const evaluatedAnswers: StoredAttemptAnswer[] = [];

    for (const q of questions) {
      const key = keysMap.get(q.id);
      const userSub = submittedMap.get(q.id);
      const givenAnswer = userSub?.answer;
      const flagged = userSub?.flagged || false;

      let awarded = 0;
      const maxMarks = q.max_marks || (q.type === 'short_answer' ? 2 : 1);
      totalMax += maxMarks;

      let verdict: 'correct' | 'partial' | 'incorrect' | 'unanswered' = 'unanswered';
      let feedbackText = 'No answer provided.';
      let displayGiven = 'No answer submitted';
      let displayCorrect = '';
      let explanation = key?.explanation || 'Explanation of the core concept and reasoning.';
      let rememberTip = key?.remember_tip || 'Review key principles.';
      let keyPointsHit: string[] = [];
      let keyPointsMissed: string[] = [];

      const isUnanswered = givenAnswer === undefined || givenAnswer === null || (typeof givenAnswer === 'string' && givenAnswer.trim() === '');

      if (isUnanswered) {
        verdict = 'unanswered';
        unansweredCount++;
        feedbackText = 'This question was left unanswered.';
        if (q.type === 'mcq' && q.options && key?.correct_option !== undefined && key?.correct_option !== null) {
          displayCorrect = q.options[key.correct_option] || `Option ${key.correct_option + 1}`;
        } else if (q.type === 'true_false') {
          displayCorrect = key?.correct_bool ? 'True' : 'False';
        } else if (q.type === 'fill_blank') {
          displayCorrect = (key?.accepted_answers || [])[0] || 'Correct Term';
        } else if (q.type === 'short_answer') {
          displayCorrect = key?.rubric?.sample_answer || key?.model_answer || 'Expected model response';
        }
      } else if (q.type === 'mcq') {
        const selectedOption = typeof givenAnswer === 'number' ? givenAnswer : parseInt(String(givenAnswer), 10);
        displayGiven = q.options && q.options[selectedOption] !== undefined
          ? q.options[selectedOption]
          : `Option ${selectedOption + 1}`;

        const correctIdx = key?.correct_option ?? 0;
        displayCorrect = q.options && q.options[correctIdx] !== undefined
          ? q.options[correctIdx]
          : `Option ${correctIdx + 1}`;

        if (selectedOption === correctIdx) {
          verdict = 'correct';
          awarded = maxMarks;
          correctCount++;
          feedbackText = `Correct! You accurately chose "${displayGiven}".`;
        } else {
          verdict = 'incorrect';
          incorrectCount++;
          feedbackText = `Incorrect. You chose "${displayGiven}". The correct answer is "${displayCorrect}".`;
        }
      } else if (q.type === 'true_false') {
        const givenBool = typeof givenAnswer === 'boolean' ? givenAnswer : String(givenAnswer).toLowerCase() === 'true';
        displayGiven = givenBool ? 'True' : 'False';
        displayCorrect = key?.correct_bool ? 'True' : 'False';

        if (givenBool === key?.correct_bool) {
          verdict = 'correct';
          awarded = maxMarks;
          correctCount++;
          feedbackText = `Correct! Statement is indeed ${displayCorrect}.`;
        } else {
          verdict = 'incorrect';
          incorrectCount++;
          feedbackText = `Incorrect. You selected ${displayGiven}, but the statement is ${displayCorrect}.`;
        }
      } else if (q.type === 'fill_blank') {
        displayGiven = String(givenAnswer).trim();
        const normGiven = displayGiven.toLowerCase().replace(/[^a-z0-9]/g, '');
        const accepted = (key?.accepted_answers || []).map((a: string) => a.toLowerCase().replace(/[^a-z0-9]/g, ''));
        displayCorrect = (key?.accepted_answers || [])[0] || 'Accepted term';

        if (accepted.some((acc: string) => acc === normGiven || (acc.length > 4 && (normGiven.includes(acc) || acc.includes(normGiven))))) {
          verdict = 'correct';
          awarded = maxMarks;
          correctCount++;
          feedbackText = `Correct! Accurate term: "${displayGiven}".`;
        } else {
          verdict = 'incorrect';
          incorrectCount++;
          feedbackText = `Incorrect. You answered "${displayGiven}". The expected term is "${displayCorrect}".`;
        }
      } else if (q.type === 'short_answer') {
        displayGiven = String(givenAnswer).trim();
        displayCorrect = key?.rubric?.sample_answer || key?.model_answer || 'Comprehensive model response';
        const rubricPoints = key?.rubric?.key_points || [];

        try {
          // Accurate AI grading with structured examiner output
          const aiPrompt = `Question: "${q.prompt}"
Subject: "${q.subject || ''}" | Topic: "${q.topic || ''}"
Student Answer: "${displayGiven}"
Reference Model Answer: "${displayCorrect}"
Rubric Breakdown: ${JSON.stringify(rubricPoints)}
Total Max Marks: ${maxMarks}`;

          const aiMarking: MarkingResult = await generateStructured({
            prompt: aiPrompt,
            systemInstruction: MARKING_SYSTEM_PROMPT,
            schema: markingResultSchema,
            temperature: 0.1,
          });

          awarded = Math.max(0, Math.min(Number(aiMarking.awarded_marks) || 0, maxMarks));
          verdict = aiMarking.verdict;
          feedbackText = aiMarking.feedback;
          keyPointsHit = aiMarking.key_points_hit || [];
          keyPointsMissed = aiMarking.key_points_missed || [];
          if (aiMarking.explanation_of_correct) {
            explanation = aiMarking.explanation_of_correct;
          }

          if (verdict === 'correct') correctCount++;
          else if (verdict === 'partial') partialCount++;
          else incorrectCount++;
        } catch {
          // Dynamic pedagogical semantic scoring fallback
          const lowerAns = displayGiven.toLowerCase();
          let hitPoints = 0;

          for (const rp of rubricPoints) {
            const words = rp.point.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
            const matched = words.some((w) => lowerAns.includes(w));
            if (matched) {
              hitPoints++;
              keyPointsHit.push(rp.point);
            } else {
              keyPointsMissed.push(rp.point);
            }
          }

          if (rubricPoints.length === 0) {
            if (displayGiven.length > 40) {
              verdict = 'correct';
              awarded = maxMarks;
              correctCount++;
              feedbackText = 'Well-structured response addressing the fundamental concept accurately.';
            } else if (displayGiven.length > 15) {
              verdict = 'partial';
              awarded = Number((maxMarks * 0.6).toFixed(1));
              partialCount++;
              feedbackText = 'Good initial concept, but could be elaborated with specific mechanisms.';
            } else {
              verdict = 'incorrect';
              awarded = 0;
              incorrectCount++;
              feedbackText = 'Brief response missing key supporting explanations.';
            }
          } else {
            const hitRatio = hitPoints / rubricPoints.length;
            if (hitRatio >= 0.75) {
              verdict = 'correct';
              awarded = maxMarks;
              correctCount++;
              feedbackText = 'Excellent answer covering the essential rubric points.';
            } else if (hitRatio >= 0.3) {
              verdict = 'partial';
              awarded = Number((maxMarks * 0.5).toFixed(1));
              partialCount++;
              feedbackText = 'Partially correct. You identified key ideas but omitted required details.';
            } else {
              verdict = 'incorrect';
              awarded = 0;
              incorrectCount++;
              feedbackText = 'Incomplete response. Key required concepts were missed.';
            }
          }
        }
      }

      totalAwarded += awarded;

      const storedAns: StoredAttemptAnswer = {
        id: randomUUID(),
        attempt_id: attemptId,
        question_id: q.id,
        user_id: userId,
        answer: givenAnswer,
        flagged,
        awarded_marks: awarded,
        max_marks: maxMarks,
        verdict,
        feedback: {
          text: formatMathNotation(feedbackText),
          given: formatMathNotation(displayGiven),
          correct: formatMathNotation(displayCorrect),
          explanation: formatMathNotation(explanation),
          remember_tip: formatMathNotation(rememberTip),
          key_points_hit: keyPointsHit.length > 0 ? keyPointsHit.map((p) => formatMathNotation(p)) : undefined,
          key_points_missed: keyPointsMissed.length > 0 ? keyPointsMissed.map((p) => formatMathNotation(p)) : undefined,
        },
      };

      evaluatedAnswers.push(storedAns);
    }

    const scorePct = totalMax > 0 ? Math.round((totalAwarded / totalMax) * 100) : 0;
    const submittedAt = new Date().toISOString();
    const startTime = attempt.started_at ? new Date(attempt.started_at).getTime() : Date.now();
    const timeTaken = Math.max(1, Math.round((new Date(submittedAt).getTime() - startTime) / 1000));

    const updatedAttempt = {
      ...attempt,
      status: 'marked' as const,
      submitted_at: submittedAt,
      marked_at: submittedAt,
      score: totalAwarded,
      max_score: totalMax,
      correct_count: correctCount,
      partial_count: partialCount,
      incorrect_count: incorrectCount,
      unanswered_count: unansweredCount,
      time_taken_seconds: timeTaken,
    };

    // 1. Save in server quiz store
    quizStore.updateAttempt(attemptId, updatedAttempt);
    quizStore.saveAttemptAnswers(attemptId, evaluatedAnswers);

    // 2. Best-effort sync to Supabase if configured
    try {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin
        .from('attempts')
        .update({
          status: 'marked',
          submitted_at: submittedAt,
          marked_at: submittedAt,
          score: totalAwarded,
          max_score: totalMax,
          correct_count: correctCount,
          partial_count: partialCount,
          incorrect_count: incorrectCount,
          unanswered_count: unansweredCount,
          time_taken_seconds: timeTaken,
        })
        .eq('id', attemptId);

      for (const ans of evaluatedAnswers) {
        await supabaseAdmin.from('attempt_answers').upsert({
          attempt_id: attemptId,
          question_id: ans.question_id,
          user_id: userId,
          answer: ans.answer,
          flagged: ans.flagged,
          awarded_marks: ans.awarded_marks,
          max_marks: ans.max_marks,
          verdict: ans.verdict,
          feedback: ans.feedback,
        });

        // Record mistake if incorrect or partial
        if (ans.verdict === 'incorrect' || ans.verdict === 'partial' || ans.verdict === 'unanswered') {
          const q = questions.find((item) => item.id === ans.question_id);
          const dedupeKey = `${q?.concept || q?.topic}_${ans.question_id}`;
          await supabaseAdmin.rpc('record_mistake', {
            p_user: userId,
            p_dedupe_key: dedupeKey,
            p_question_id: ans.question_id,
            p_quiz_id: attempt.quiz_id,
            p_subject: q?.subject || '',
            p_topic: q?.topic || '',
            p_concept: q?.concept || '',
            p_question_type: q?.type || 'mcq',
            p_prompt: q?.prompt || '',
            p_options: q?.options || null,
            p_user_answer: ans.feedback.given,
            p_correct_answer: ans.feedback.correct,
            p_explanation: ans.feedback.explanation,
            p_remember_tip: ans.feedback.remember_tip,
            p_verdict: ans.verdict === 'unanswered' ? 'unanswered' : ans.verdict,
          });
        }
      }
    } catch {
      // Supabase unconfigured or offline in dev/preview
    }

    return NextResponse.json({
      attempt: updatedAttempt,
      scorePercentage: scorePct,
      answers: evaluatedAnswers,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
