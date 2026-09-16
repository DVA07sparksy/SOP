import { Router } from "express";
import { z } from "zod";
import { prisma } from "@sop/db";
import { AuthedRequest, requireAuth, requireRole } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";

export const achievementsRouter = Router();

// Shared evidence validation (doc §49: type + size limits, metadata only in DB).
const EVIDENCE_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];
const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;

const evidenceSchema = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.enum(EVIDENCE_MIME as [string, ...string[]]),
  byteSize: z.number().int().min(1).max(EVIDENCE_MAX_BYTES),
  storageKey: z.string().min(1).max(500),
});

const studentCreateSchema = z.object({
  title: z.string().min(2).max(200),
  competitionId: z.string().uuid().nullable().optional(),
  placement: z.string().max(100).nullable().optional(),
  achievedAt: z.string().datetime().nullable().optional(),
  prizeDescription: z.string().max(2000).nullable().optional(),
  certificateUrl: z.string().url().max(2000).nullable().optional(),
  evidence: evidenceSchema.optional(),
});

const adminCreateSchema = z.object({
  studentId: z.string().uuid(),
  competitionId: z.string().uuid().nullable().optional(),
  title: z.string().min(2).max(200).optional(),
  result: z.string().min(2).max(200).optional(),
  certificateUrl: z.string().url().max(2000).optional(),
  prizeDescription: z.string().max(2000).optional(),
});

// POST /achievements - student records their OWN achievement (doc §24:
// upload certificate images/PDFs/screenshots; verification is a separate layer).
achievementsRouter.post("/mine", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = studentCreateSchema.parse(req.body);
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) throw new HttpError(404, "Student profile not found");

    if (body.competitionId) {
      const competition = await prisma.competition.findUnique({
        where: { id: body.competitionId },
        select: { id: true },
      });
      if (!competition) throw new HttpError(400, "Competition not found");
    }

    const achievement = await prisma.achievement.create({
      data: {
        studentId: student.id,
        competitionId: body.competitionId ?? null,
        title: body.title,
        placement: body.placement ?? null,
        achievedAt: body.achievedAt ? new Date(body.achievedAt) : null,
        prizeDescription: body.prizeDescription ?? null,
        certificateUrl: body.certificateUrl ?? null,
        source: "STUDENT",
        verificationStatus: "UNVERIFIED",
        // Evidence metadata row: the file bytes live in object storage under a
        // private key; the DB stores type/size/key only (doc §49).
        evidences: body.evidence
          ? {
              create: {
                fileName: body.evidence.fileName,
                mimeType: body.evidence.mimeType,
                byteSize: body.evidence.byteSize,
                storageKey: body.evidence.storageKey,
                uploadedById: req.user!.id,
              },
            }
          : undefined,
      },
      include: { evidences: true },
    });

    await prisma.event.create({
      data: {
        userId: req.user!.id,
        type: "achievement_added",
        metadata: JSON.stringify({ achievementId: achievement.id }),
      },
    });

    res.status(201).json(achievement);
  } catch (err) {
    next(err);
  }
});

// GET /achievements/mine - the student's portfolio.
achievementsRouter.get("/mine", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });
    const achievements = await prisma.achievement.findMany({
      where: { studentId: student.id },
      include: { competition: { select: { id: true, title: true } }, evidences: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(achievements);
  } catch (err) {
    next(err);
  }
});

// DELETE /achievements/mine/:id - student removes their own record.
achievementsRouter.delete("/mine/:id", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });
    const achievement = await prisma.achievement.findUnique({ where: { id: req.params.id } });
    if (!achievement || achievement.studentId !== student.id) {
      throw new HttpError(404, "Achievement not found");
    }
    await prisma.achievement.delete({ where: { id: achievement.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /achievements - recorded by an institution admin or platform admin
// after results are verified. Server-side ownership check: institution admins
// may only record achievements for students enrolled at THEIR institution.
achievementsRouter.post(
  "/",
  requireAuth,
  requireRole("INSTITUTION_ADMIN", "PLATFORM_ADMIN", "SUPER_ADMIN"),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = adminCreateSchema.parse(req.body);

      let institutionId: string | undefined;
      if (req.user!.role === "INSTITUTION_ADMIN") {
        const admin = await prisma.user.findUniqueOrThrow({
          where: { id: req.user!.id },
          include: { institutionAdminOf: { select: { id: true } } },
        });
        institutionId = admin.institutionAdminOf[0]?.id;
        if (!institutionId) throw new HttpError(403, "No institution linked to this account");

        const student = await prisma.student.findUnique({
          where: { id: body.studentId },
          select: { institutionId: true },
        });
        if (!student || student.institutionId !== institutionId) {
          throw new HttpError(403, "Student is not enrolled at your institution");
        }
      }

      const achievement = await prisma.achievement.create({
        data: {
          studentId: body.studentId,
          competitionId: body.competitionId ?? null,
          title: body.title ?? body.result ?? "Achievement",
          placement: body.result ?? null,
          certificateUrl: body.certificateUrl,
          prizeDescription: body.prizeDescription,
          source: "INSTITUTION",
          verificationStatus: "PENDING_REVIEW",
        },
      });
      res.status(201).json(achievement);
    } catch (err) {
      next(err);
    }
  }
);
