import { prisma } from '../../config/prisma.js';
import { scoreAttempt, type ScoringQuestion, type ScoringAnswer } from './scoring.js';
import { resolveBadgeLevel, isBadgeEarned } from './badge.js';
import { attemptForbidden, attemptNotFound } from './attempts.js';
import { attemptNotInProgress } from './answers.js';

export const submitAttempt = async (attemptId: string, userId: string) => {
  const attempt = await prisma.certificationAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw attemptNotFound();
  if (attempt.userId !== userId) throw attemptForbidden();
  // Also blocks a double-submit: once COMPLETED, this throws instead of
  // recomputing — re-submitting never silently overwrites an existing score.
  if (attempt.status !== 'IN_PROGRESS') throw attemptNotInProgress();

  // Only active questions count — mirrors the public GET and the CHOICE
  // question validation in answers.ts, so a question deactivated mid-attempt
  // is excluded from scoring and its orphaned answers just earn 0 below.
  const [questions, answers] = await Promise.all([
    prisma.certificationQuestion.findMany({
      where: { isActive: true },
      include: { options: { select: { id: true, points: true } } },
    }),
    prisma.answer.findMany({ where: { attemptId } }),
  ]);

  const scoringQuestions: ScoringQuestion[] = questions.map((question) => ({
    id: question.id,
    type: question.type,
    weight: question.weight,
    maxPoints: question.maxPoints,
    options: question.options,
  }));
  const scoringAnswers: ScoringAnswer[] = answers.map((answer) => ({
    questionId: answer.questionId,
    optionId: answer.optionId,
    textAnswer: answer.textAnswer,
    numericAnswer: answer.numericAnswer,
  }));

  const { totalScore, questionScores } = scoreAttempt(scoringQuestions, scoringAnswers);
  const badgeLevel = await resolveBadgeLevel(totalScore);
  const earned = isBadgeEarned(badgeLevel);

  const scoreByQuestion = new Map(questionScores.map((qs) => [qs.questionId, qs.pointsEarned]));
  const answersByQuestion = new Map<string, typeof answers>();
  for (const answer of answers) {
    const list = answersByQuestion.get(answer.questionId) ?? [];
    list.push(answer);
    answersByQuestion.set(answer.questionId, list);
  }

  return prisma.$transaction(async (tx) => {
    // A CHECKBOX question can have several Answer rows for one question —
    // there's no per-question junction row to hold the aggregate, so the
    // question's total pointsEarned goes on the first row and the rest get
    // 0. This keeps SUM(Answer.pointsEarned) per attempt meaningful instead
    // of overcounting if someone naively sums every row.
    for (const [questionId, questionAnswers] of answersByQuestion) {
      const total = scoreByQuestion.get(questionId) ?? 0;
      const [first, ...rest] = questionAnswers;
      await tx.answer.update({ where: { id: first!.id }, data: { pointsEarned: total } });
      for (const extra of rest) {
        await tx.answer.update({ where: { id: extra.id }, data: { pointsEarned: 0 } });
      }
    }

    const updatedAttempt = await tx.certificationAttempt.update({
      where: { id: attemptId },
      data: { status: 'COMPLETED', score: totalScore, completedAt: new Date() },
    });

    // Assumes the applicant already has a Profile (Domain B's concern to
    // create one) — throws if not, rather than silently no-op-ing on a
    // completed certification that would otherwise be invisible anywhere.
    await tx.profile.update({
      where: { userId },
      data: {
        certificationStatus: earned ? 'COMPLETED' : 'REJECTED',
        certificationScore: totalScore,
        certificationBadge: earned ? badgeLevel.name : null,
      },
    });

    // TODO(Domain A): route this through a shared notification service once
    // one exists — created directly here for now since nothing else does.
    if (earned) {
      await tx.notification.create({
        data: {
          userId,
          type: 'CERTIFICATION_BADGE_EARNED',
          title: 'Badge de certification obtenu',
          message: `Vous avez obtenu le badge "${badgeLevel.name}" avec un score de ${totalScore}/100.`,
        },
      });
    }

    return { attempt: updatedAttempt, score: totalScore, badge: badgeLevel };
  });
};
