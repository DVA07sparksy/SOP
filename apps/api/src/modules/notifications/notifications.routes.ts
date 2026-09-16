import { Router } from "express";
import { prisma } from "@sop/db";
import { queueDeadlineReminders } from "@sop/shared";
import { requireAuth, requireRole } from "../../middleware/auth";

export const notificationsRouter = Router();

// POST /notifications/run-deadline-digest - normally invoked by a cron/scheduled
// trigger; exposed so admins can also run it on demand.
notificationsRouter.post(
  "/run-deadline-digest",
  requireAuth,
  requireRole("PLATFORM_ADMIN", "SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const lookaheadDays = Number((req.body as any)?.lookaheadDays ?? 3);
      const result = await queueDeadlineReminders(Number.isFinite(lookaheadDays) ? Math.min(30, Math.max(1, lookaheadDays)) : 3);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /notifications/deadlines - student-facing upcoming deadlines for saved apps
import { AuthedRequest } from "../../middleware/auth";

notificationsRouter.get("/deadlines", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });
    const soon = new Date(Date.now() + 14 * 86_400_000);
    const apps = await prisma.application.findMany({
      where: {
        studentId: student.id,
        status: { in: ["SAVED", "INTERESTED", "STARTED", "APPLIED"] },
        competition: { status: "PUBLISHED", deadline: { gt: new Date(), lt: soon } },
      },
      include: { competition: { select: { id: true, title: true, deadline: true } } },
      orderBy: { competition: { deadline: "asc" } },
    });
    res.json(apps);
  } catch (err) {
    next(err);
  }
});
