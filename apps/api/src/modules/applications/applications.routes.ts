import { Router } from "express";
import { z } from "zod";
import { prisma } from "@sop/db";
import { AuthedRequest, requireAuth } from "../../middleware/auth";

export const applicationsRouter = Router();

// Application journey statuses (product doc §21).
const STATUSES = [
  "DISCOVERED",
  "SAVED",
  "PREPARING",
  "APPLIED",
  "SELECTED",
  "FINALIST",
  "WINNER",
  "NOT_SELECTED",
  "WITHDRAWN",
] as const;

const upsertSchema = z.object({
  competitionId: z.string().uuid(),
  status: z.enum(STATUSES).default("SAVED"),
  followed: z.boolean().optional(),
  teamId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// POST /applications - upsert by (student, competition). Idempotent for the
// Save / Follow / I WANT TO TRY buttons on the detail page.
applicationsRouter.post("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = upsertSchema.parse(req.body);
    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });

    const competition = await prisma.competition.findUnique({
      where: { id: body.competitionId },
      select: { id: true, status: true },
    });
    if (!competition || competition.status !== "PUBLISHED") {
      throw Object.assign(new Error("Competition not found or not published"), { status: 404 });
    }

    const application = await prisma.application.upsert({
      where: { studentId_competitionId: { studentId: student.id, competitionId: body.competitionId } },
      update: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.followed !== undefined ? { followed: body.followed } : {}),
        ...(body.teamId !== undefined ? { teamId: body.teamId } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        submittedAt: body.status === "APPLIED" ? new Date() : undefined,
      },
      create: {
        studentId: student.id,
        competitionId: body.competitionId,
        status: body.status,
        followed: body.followed ?? false,
        teamId: body.teamId ?? null,
        notes: body.notes ?? null,
        submittedAt: body.status === "APPLIED" ? new Date() : undefined,
      },
    });

    // Fire-and-forget analytics event for the opportunity-journey funnel (§31).
    await prisma.event.create({
      data: {
        userId: req.user!.id,
        type: `application.${body.status.toLowerCase()}`,
        metadata: JSON.stringify({ competitionId: body.competitionId }),
      },
    });

    res.status(201).json(application);
  } catch (err) {
    next(err);
  }
});
