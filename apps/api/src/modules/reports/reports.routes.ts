import { Router } from "express";
import { z } from "zod";
import { prisma } from "@sop/db";
import { AuthedRequest, requireAuth } from "../../middleware/auth";
import { rateLimit } from "../../lib/rateLimit";

export const reportsRouter = Router();

const reportSchema = z.object({
  competitionId: z.string().uuid(),
  reason: z.enum([
    "SUSPICIOUS",
    "FAKE_OR_SCAM",
    "WRONG_INFO",
    "EXPIRED",
    "INACCESSIBLE_LINK",
    "OTHER",
  ]),
  message: z.string().max(2000).optional(),
});

// POST /reports - any logged-in student can flag suspicious/fraudulent info
// (architecture doc §18: reports feed the trust system).
reportsRouter.post("/", requireAuth, rateLimit({ windowMs: 60_000, max: 5 }), async (req: AuthedRequest, res, next) => {
  try {
    const body = reportSchema.parse(req.body);

    const competition = await prisma.competition.findUnique({ where: { id: body.competitionId } });
    if (!competition) {
      return res.status(404).json({ error: "Competition not found" });
    }

    const report = await prisma.report.create({
      data: {
        competitionId: body.competitionId,
        reportedById: req.user!.id,
        reason: body.reason,
        message: body.message ?? null,
      },
    });

    await prisma.event.create({
      data: {
        userId: req.user!.id,
        type: "competition_reported",
        metadata: JSON.stringify({ competitionId: body.competitionId, reason: body.reason }),
      },
    });

    res.status(201).json({ id: report.id, message: "Report received — our team will review it." });
  } catch (err) {
    next(err);
  }
});

// GET /reports/mine - student sees their own reports and their status
reportsRouter.get("/mine", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const reports = await prisma.report.findMany({
      where: { reportedById: req.user!.id },
      include: { competition: { select: { title: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(reports);
  } catch (err) {
    next(err);
  }
});
