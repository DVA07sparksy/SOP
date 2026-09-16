import { Router } from "express";
import { z } from "zod";
import { prisma } from "@sop/db";
import { parseJsonArray } from "@sop/shared";
import { AuthedRequest, requireAuth, requireRole } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("PLATFORM_ADMIN", "SUPER_ADMIN", "WORKER"));

const REVIEW_STATUSES = ["DISCOVERED", "EXTRACTED", "DUPLICATE_REVIEW", "VERIFICATION", "NEEDS_REVIEW"];

// GET /admin/review-queue - everything awaiting a human decision
adminRouter.get("/review-queue", async (_req, res, next) => {
  try {
    const items = await prisma.competition.findMany({
      where: { status: { in: REVIEW_STATUSES } },
      orderBy: { updatedAt: "asc" },
      include: {
        source: true,
        rawPage: { select: { id: true, url: true, rawText: true } },
        verifications: { orderBy: { createdAt: "desc" }, take: 3 },
        versions: { orderBy: { createdAt: "desc" }, take: 5 },
        reports: { where: { resolved: false } },
      },
    });
    res.json(
      items.map((item) => ({
        ...item,
        category: parseJsonArray(item.category),
        countries: parseJsonArray(item.countries),
        benefits: parseJsonArray(item.benefits),
        educationLevels: parseJsonArray(item.educationLevels),
      }))
    );
  } catch (err) {
    next(err);
  }
});

// GET /admin/competitions/:id - full review detail incl. raw source text and evidence
adminRouter.get("/competitions/:id", async (req, res, next) => {
  try {
    const competition = await prisma.competition.findUnique({
      where: { id: req.params.id },
      include: {
        source: true,
        rawPage: true,
        versions: { orderBy: { createdAt: "desc" } },
        verifications: { orderBy: { createdAt: "desc" } },
        reports: { include: { reportedBy: { select: { email: true } } } },
      },
    });
    if (!competition) throw new HttpError(404, "Competition not found");
    res.json(competition);
  } catch (err) {
    next(err);
  }
});

const editSchema = z.object({
  title: z.string().min(2).max(300).optional(),
  organizer: z.string().max(200).nullable().optional(),
  description: z.string().max(10_000).nullable().optional(),
  category: z.array(z.string().max(60)).max(10).optional(),
  eligibilityRawText: z.string().max(10_000).nullable().optional(),
  ageMin: z.number().int().min(0).max(120).nullable().optional(),
  ageMax: z.number().int().min(0).max(120).nullable().optional(),
  educationLevels: z.array(z.enum(["SECONDARY", "UNIVERSITY", "GRADUATE", "OTHER"])).optional(),
  countries: z.array(z.string().max(80)).optional(),
  deadline: z.string().datetime().nullable().optional(),
  format: z.enum(["ONLINE", "OFFLINE", "HYBRID"]).optional(),
  location: z.string().max(200).nullable().optional(),
  cost: z.string().max(100).nullable().optional(),
  benefits: z.array(z.string().max(60)).optional(),
  officialUrl: z.string().url().nullable().optional(),
  applicationUrl: z.string().url().nullable().optional(),
  reason: z.string().min(3).max(500), // required: every edit is explained
});

// PATCH /admin/competitions/:id - human edit with version snapshot + audit trail
adminRouter.patch("/competitions/:id", async (req: AuthedRequest, res, next) => {
  try {
    const body = editSchema.parse(req.body);
    const { reason, category, educationLevels, countries, benefits, deadline, ...fields } = body;

    const before = await prisma.competition.findUnique({ where: { id: req.params.id } });
    if (!before) throw new HttpError(404, "Competition not found");

    const updated = await prisma.$transaction(async (tx) => {
      const after = await tx.competition.update({
        where: { id: before.id },
        data: {
          ...fields,
          // JSON-array fields under the SQLite convention (real columns once
          // on PostgreSQL).
          ...(category ? { category: JSON.stringify(category) } : {}),
          ...(educationLevels ? { educationLevels: JSON.stringify(educationLevels) } : {}),
          ...(countries ? { countries: JSON.stringify(countries) } : {}),
          ...(benefits ? { benefits: JSON.stringify(benefits) } : {}),
          ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
        },
      });

      await tx.competitionVersion.create({
        data: {
          competitionId: before.id,
          diff: JSON.stringify({ before, after, reason }),
          producedBy: `admin:${req.user!.id}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorType: "human",
          action: "competition.edited",
          targetType: "Competition",
          targetId: before.id,
          metadata: JSON.stringify({ reason, fields: Object.keys(fields) }),
        },
      });

      return after;
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const decisionSchema = z.object({
  decision: z.enum(["PUBLISH", "REJECT", "REQUEST_CHANGES", "ARCHIVE"]),
  note: z.string().max(1000).optional(),
});

// Review decisions: workers may request evidence, reject and archive (doc §27
// "approve/reject/escalate"), but PUBLISH is reserved for platform admins
// (doc §7 worker/admin privilege separation — the human publication gate).
adminRouter.post(
  "/competitions/:id/decision",
  async (req: AuthedRequest, res, next) => {
    try {
    const body = decisionSchema.parse(req.body);
    if (body.decision === "PUBLISH" && !["PLATFORM_ADMIN", "SUPER_ADMIN"].includes(req.user!.role)) {
      throw new HttpError(403, "Only platform admins can publish — workers can request evidence, reject or archive");
    }
    const competition = await prisma.competition.findUnique({ where: { id: req.params.id } });
    if (!competition) throw new HttpError(404, "Competition not found");

    const status =
      body.decision === "PUBLISH"
        ? "PUBLISHED"
        : body.decision === "REJECT"
          ? "REJECTED"
          : body.decision === "ARCHIVE"
            ? "ARCHIVED"
            : "EXTRACTED";

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.competition.update({
        where: { id: competition.id },
        data: {
          status,
          publishedAt: status === "PUBLISHED" ? competition.publishedAt ?? new Date() : null,
          trustStatus: status === "PUBLISHED" ? "APPROVED" : competition.trustStatus,
        },
      });
      await tx.competitionVersion.create({
        data: {
          competitionId: competition.id,
          diff: JSON.stringify({ before: { status: competition.status }, after: { status }, reason: body.note ?? body.decision }),
          producedBy: `admin:${req.user!.id}`,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorType: "human",
          action: `competition.${body.decision.toLowerCase()}`,
          targetType: "Competition",
          targetId: competition.id,
          metadata: JSON.stringify({ note: body.note ?? null }),
        },
      });
      return c;
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /admin/competitions/:id/reprocess - re-run eligibility/dedup/verification
adminRouter.post("/competitions/:id/reprocess", async (req: AuthedRequest, res, next) => {
  try {
    const competition = await prisma.competition.findUnique({ where: { id: req.params.id } });
    if (!competition) throw new HttpError(404, "Competition not found");

    const { enqueue } = await import("../../lib/queues");
    await enqueue.eligibility({ competitionId: competition.id });
    await enqueue.duplicateDetection({ competitionId: competition.id });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorType: "human",
        action: "competition.reprocess_requested",
        targetType: "Competition",
        targetId: competition.id,
        metadata: null,
      },
    });

    res.status(202).json({ queued: true });
  } catch (err) {
    next(err);
  }
});

// GET /admin/reports - user-submitted reports triage inbox
adminRouter.get("/reports", async (_req, res, next) => {
  try {
    const reports = await prisma.report.findMany({
      where: { resolved: false },
      include: { competition: { select: { id: true, title: true, status: true } }, reportedBy: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

const resolveReportSchema = z.object({
  action: z.enum(["UNPUBLISH", "DISMISS", "FLAG_SOURCE"]),
  note: z.string().max(1000).optional(),
});

// POST /admin/reports/:id/resolve - act on a report (audit-logged)
adminRouter.post("/reports/:id/resolve", async (req: AuthedRequest, res, next) => {
  try {
    const body = resolveReportSchema.parse(req.body);
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) throw new HttpError(404, "Report not found");

    await prisma.$transaction(async (tx) => {
      if (body.action === "UNPUBLISH") {
        await tx.competition.update({
          where: { id: report.competitionId },
          data: { status: "NEEDS_REVIEW" },
        });
      }
      if (body.action === "FLAG_SOURCE" && report.competitionId) {
        const competition = await tx.competition.findUnique({ where: { id: report.competitionId } });
        if (competition?.sourceId) {
          await tx.source.update({
            where: { id: competition.sourceId },
            data: { reliabilityScore: { decrement: 15 } },
          });
        }
      }
      await tx.report.update({ where: { id: report.id }, data: { resolved: true } });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorType: "human",
          action: `report.${body.action.toLowerCase()}`,
          targetType: "Report",
          targetId: report.id,
          metadata: JSON.stringify({ note: body.note ?? null, competitionId: report.competitionId }),
        },
      });
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /admin/sources - source reputation dashboard
adminRouter.get("/sources", async (_req, res, next) => {
  try {
    const sources = await prisma.source.findMany({
      orderBy: { reliabilityScore: "asc" },
      include: { _count: { select: { competitions: true, rawPages: false as any } } },
    });
    res.json(sources);
  } catch (err) {
    next(err);
  }
});

const sourceSchema = z.object({
  reliabilityScore: z.number().int().min(0).max(100).optional(),
  organization: z.string().max(200).nullable().optional(),
});

adminRouter.patch("/sources/:id", async (req: AuthedRequest, res, next) => {
  try {
    const body = sourceSchema.parse(req.body);
    const source = await prisma.source.update({ where: { id: req.params.id }, data: body });
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorType: "human",
        action: "source.updated",
        targetType: "Source",
        targetId: source.id,
        metadata: JSON.stringify(body),
      },
    });
    res.json(source);
  } catch (err) {
    next(err);
  }
});

// GET /admin/ai-runs - AI cost/failure observability (AiRun table)
adminRouter.get("/ai-runs", async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [byTask, failures] = await Promise.all([
      prisma.aiRun.groupBy({
        by: ["task", "provider", "status"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _avg: { latencyMs: true },
      }),
      prisma.aiRun.findMany({
        where: { status: "error", createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    res.json({ byTask, recentFailures: failures });
  } catch (err) {
    next(err);
  }
});

// GET /admin/audit-log - global audit trail
adminRouter.get("/audit-log", async (req, res, next) => {
  try {
    const schema = z.object({
      targetType: z.string().optional(),
      targetId: z.string().optional(),
      take: z.coerce.number().int().min(1).max(200).default(100),
    });
    const q = schema.parse(req.query);
    const logs = await prisma.auditLog.findMany({
      where: { targetType: q.targetType, targetId: q.targetId },
      orderBy: { createdAt: "desc" },
      take: q.take,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// GET /admin/stats - real platform-wide counts (replaces the hardcoded demo
// numbers the admin dashboard used to show).
adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [
      published,
      needsReview,
      students,
      institutions,
      applications,
      applicationsThisMonth,
      achievements,
      openReports,
    ] = await Promise.all([
      prisma.competition.count({ where: { status: "PUBLISHED" } }),
      prisma.competition.count({ where: { status: { in: ["NEEDS_REVIEW", "EXTRACTED", "DISCOVERED", "DUPLICATE_REVIEW", "VERIFICATION"] } } }),
      prisma.student.count(),
      prisma.institution.count(),
      prisma.application.count(),
      prisma.application.count({ where: { createdAt: { gte: since } } }),
      prisma.achievement.count(),
      prisma.report.count({ where: { resolved: false } }),
    ]);
    res.json({
      publishedCompetitions: published,
      awaitingReview: needsReview,
      students,
      institutions,
      applications,
      applicationsThisMonth,
      achievements,
      openReports,
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/users - user management list (minimal fields, paginated).
adminRouter.get("/users", async (req, res, next) => {
  try {
    const q = z
      .object({
        role: z.string().max(40).optional(),
        take: z.coerce.number().int().min(1).max(200).default(100),
      })
      .parse(req.query);
    const users = await prisma.user.findMany({
      where: q.role ? { role: q.role } : undefined,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        student: { select: { fullName: true, institutionId: true } },
        institutionAdminOf: { select: { name: true } },
        _count: { select: { reports: true } },
      },
      orderBy: { createdAt: "desc" },
      take: q.take,
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

const userRoleSchema = z.object({ role: z.enum(["STUDENT", "INSTITUTION_ADMIN", "PLATFORM_ADMIN", "SUPER_ADMIN", "WORKER", "COORDINATOR"]) });

// PATCH /admin/users/:id/role - role management, audit-logged. Super-admin only.
adminRouter.patch(
  "/users/:id/role",
  requireRole("SUPER_ADMIN"),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = userRoleSchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) throw new HttpError(404, "User not found");
      if (user.id === req.user!.id) throw new HttpError(400, "Cannot change your own role");

      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({ where: { id: user.id }, data: { role: body.role } });
        await tx.auditLog.create({
          data: {
            actorId: req.user!.id,
            actorType: "human",
            action: "user.role_changed",
            targetType: "User",
            targetId: user.id,
            metadata: JSON.stringify({ from: user.role, to: body.role }),
          },
        });
        return u;
      });
      res.json({ id: updated.id, role: updated.role });
    } catch (err) {
      next(err);
    }
  }
);
