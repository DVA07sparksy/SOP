import { Router } from "express";
import { z } from "zod";
import { prisma } from "@sop/db";
import { parseJsonArray } from "@sop/shared";
import { AuthedRequest, requireAuth } from "../../middleware/auth";
import { eligibilityQueueOrInline } from "../../lib/inlineQueue";

export const studentsRouter = Router();

// Shape of the "me" response: profile plus parsed list fields so the web app
// never deals with the JSON-string storage convention.
function serializeStudent(student: any) {
  return {
    ...student,
    fieldOfStudy: parseJsonArray(student.fieldOfStudy),
    interests: parseJsonArray(student.interests),
    skills: parseJsonArray(student.skills),
    preferredFormats: parseJsonArray(student.preferredFormats),
  };
}

studentsRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
      include: { institution: true },
    });
    if (!student) throw new HttpError(404, "Student profile not found");
    res.json(serializeStudent(student));
  } catch (err) {
    next(err);
  }
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  educationLevel: z.enum(["SECONDARY", "UNIVERSITY", "GRADUATE", "OTHER"]).optional(),
  fieldOfStudy: z.array(z.string().max(60)).max(20).optional(),
  interests: z.array(z.string().max(60)).max(30).optional(),
  skills: z.array(z.string().max(60)).max(30).optional(),
  age: z.number().int().min(5).max(100).optional(),
  country: z.string().min(2).max(80).optional(),
  region: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  preferredFormats: z.array(z.enum(["ONLINE", "OFFLINE", "HYBRID"])).max(3).optional(),
});

studentsRouter.patch("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { fieldOfStudy, interests, skills, preferredFormats, ...scalars } = updateProfileSchema.parse(req.body);
    const student = await prisma.student.update({
      where: { userId: req.user!.id },
      data: {
        ...scalars,
        // SQLite JSON-string convention.
        ...(fieldOfStudy ? { fieldOfStudy: JSON.stringify(fieldOfStudy) } : {}),
        ...(interests ? { interests: JSON.stringify(interests) } : {}),
        ...(skills ? { skills: JSON.stringify(skills) } : {}),
        ...(preferredFormats ? { preferredFormats: JSON.stringify(preferredFormats) } : {}),
      },
    });

    // Profile change can flip eligibility verdicts across the catalog —
    // notify the eligibility worker (no-op with deterministic on-read checks,
    // but the hook point exists for cached verdicts at scale).
    await eligibilityQueueOrInline({ studentId: student.id });

    res.json(serializeStudent(student));
  } catch (err) {
    next(err);
  }
});

studentsRouter.get("/me/applications", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });
    const applications = await prisma.application.findMany({
      where: { studentId: student.id },
      include: { competition: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json(applications);
  } catch (err) {
    next(err);
  }
});

// Saved competitions = applications in pre-application states (§8 "saved").
studentsRouter.get("/me/saved", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });
    const saved = await prisma.application.findMany({
      where: { studentId: student.id, status: { in: ["SAVED", "INTERESTED"] } },
      include: { competition: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

studentsRouter.get("/me/achievements", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });
    const achievements = await prisma.achievement.findMany({
      where: { studentId: student.id },
      include: { competition: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(achievements);
  } catch (err) {
    next(err);
  }
});

// Imported late to avoid circular import noise in route files.
import { HttpError } from "../../middleware/errorHandler";
