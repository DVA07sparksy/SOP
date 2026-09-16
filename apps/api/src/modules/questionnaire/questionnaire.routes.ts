import { Router } from "express";
import { prisma } from "@sop/db";
import {
  QUESTIONNAIRE,
  QUESTIONNAIRE_VERSION,
  scoreQuestionnaire,
  validateQuestionnaireAnswers,
} from "@sop/shared";
import { AuthedRequest, requireAuth } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";

export const questionnaireRouter = Router();

// GET /questionnaire - the fixed question set (public definition, answers are
// per-student and private).
questionnaireRouter.get("/", (_req, res) => {
  res.json({ version: QUESTIONNAIRE_VERSION, questions: QUESTIONNAIRE });
});

// GET /questionnaire/me - the current student's latest responses.
questionnaireRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
      include: { questionnaire: true },
    });
    if (!student) throw new HttpError(404, "Student profile not found");
    res.json({
      version: student.questionnaire?.version ?? null,
      answers: student.questionnaire ? JSON.parse(student.questionnaire.answers) : null,
      updatedAt: student.questionnaire?.updatedAt ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /questionnaire/responses - create or retake the questionnaire (doc §10:
// results are editable and retakeable when meaningful changes occur).
questionnaireRouter.post("/responses", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) throw new HttpError(404, "Student profile not found");

    const validation = validateQuestionnaireAnswers(req.body?.answers ?? req.body);
    if (!validation.ok) throw new HttpError(400, validation.error);

    const signals = scoreQuestionnaire(validation.cleaned);

    // Deterministic profile refinement from questionnaire signals (doc §9/§11):
    // interests measured by the questionnaire enrich the student's interest
    // list; they never overwrite profile fields the student set themselves.
    const mergedInterests = Array.from(
      new Set([
        ...JSON.parse(student.interests || "[]").map((s: string) => s.toLowerCase()),
        ...signals.interests,
      ])
    );

    const saved = await prisma.questionnaireResponse.upsert({
      where: { studentId: student.id },
      update: {
        answers: JSON.stringify(validation.cleaned),
        version: QUESTIONNAIRE_VERSION,
      },
      create: {
        studentId: student.id,
        answers: JSON.stringify(validation.cleaned),
        version: QUESTIONNAIRE_VERSION,
      },
    });

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { interests: JSON.stringify(mergedInterests) },
    });

    await prisma.event.create({
      data: {
        userId: req.user!.id,
        type: "questionnaire_completed",
        metadata: JSON.stringify({ version: QUESTIONNAIRE_VERSION }),
      },
    });

    res.json({
      savedAt: saved.updatedAt,
      signals: {
        willingToAttemptDifficulty: signals.willingToAttemptDifficulty,
        prefersTeam: signals.prefersTeam,
        preparationCapacity: signals.preparationCapacity,
      },
      interests: JSON.parse(updated.interests),
    });
  } catch (err) {
    next(err);
  }
});
