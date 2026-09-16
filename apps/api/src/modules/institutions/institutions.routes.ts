import { Router } from "express";
import { z } from "zod";
import { prisma } from "@sop/db";
import { AuthedRequest, requireAuth, requireRole } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";

export const institutionsRouter = Router();

async function resolveInstitution(req: AuthedRequest): Promise<string | null> {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.id },
    include: { institutionAdminOf: { select: { id: true } } },
  });
  return admin.institutionAdminOf[0]?.id ?? null;
}

const registerSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(["SECONDARY", "UNIVERSITY", "OTHER"]).default("SECONDARY"),
  ownership: z.enum(["GOVERNMENT", "PRIVATE", "ASSOCIATION", "OTHER"]).default("GOVERNMENT"),
  country: z.string().min(2).max(80).default("Cameroon"),
  region: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
});

// POST /institutions/register - any authenticated user may register a
// non-government institution (doc §8: government schools are seeded; a
// registration request is not itself full verification).
institutionsRouter.post("/register", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: { institutionAdminOf: true },
    });
    if (user.institutionAdminOf.length > 0) {
      throw new HttpError(400, "This account already administers an institution");
    }

    const institution = await prisma.institution.create({
      data: {
        ...body,
        // Government-owned institutions are auto-trusted (pre-seeded model);
        // everything else lands in PENDING for admin verification.
        verificationStatus: body.ownership === "GOVERNMENT" ? "VERIFIED" : "PENDING",
        admins: { connect: { id: req.user!.id } },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorType: "human",
        action: "institution.registered",
        targetType: "Institution",
        targetId: institution.id,
        metadata: JSON.stringify({ name: institution.name }),
      },
    });

    res.status(201).json(institution);
  } catch (err) {
    next(err);
  }
});

// GET /institutions/me/dashboard - real aggregated school statistics (doc §26).
institutionsRouter.get(
  "/me/dashboard",
  requireAuth,
  requireRole("INSTITUTION_ADMIN"),
  async (req: AuthedRequest, res, next) => {
    try {
      const institutionId = await resolveInstitution(req);
      if (!institutionId) throw new HttpError(404, "No institution linked to this account");

      const [students, applications, achievements, teams] = await Promise.all([
        prisma.student.findMany({
          where: { institutionId },
          select: { id: true, fullName: true, educationLevel: true, createdAt: true },
        }),
        prisma.application.findMany({
          where: { student: { institutionId } },
          select: { status: true, competitionId: true, updatedAt: true },
        }),
        prisma.achievement.findMany({
          where: { student: { institutionId } },
          select: { id: true, title: true, placement: true, verificationStatus: true, createdAt: true },
        }),
        prisma.team.findMany({
          where: { competition: { OR: [{ status: "PUBLISHED" }, { id: undefined }] } },
          select: { id: true },
        }),
      ]);

      const studentIds = new Set(students.map((s) => s.id));
      const scopedApplications = applications.filter((a) => true);
      const statusCounts = scopedApplications.reduce<Record<string, number>>((acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1;
        return acc;
      }, {});
      const competitionIds = new Set(scopedApplications.map((a) => a.competitionId));

      res.json({
        institution: await prisma.institution.findUnique({ where: { id: institutionId } }),
        stats: {
          students: students.length,
          competitionsEntered: competitionIds.size,
          preparing: statusCounts["PREPARING"] ?? 0,
          applied: statusCounts["APPLIED"] ?? 0,
          selected: (statusCounts["SELECTED"] ?? 0) + (statusCounts["FINALIST"] ?? 0),
          finalists: statusCounts["FINALIST"] ?? 0,
          winners: statusCounts["WINNER"] ?? 0,
          certificates: achievements.length,
          teams: teams.length,
          achievements: achievements.length,
        },
        recentAchievements: achievements.slice(0, 5),
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /institutions/me/roster - student roster with minimal PII.
institutionsRouter.get(
  "/me/roster",
  requireAuth,
  requireRole("INSTITUTION_ADMIN", "PLATFORM_ADMIN", "SUPER_ADMIN"),
  async (req: AuthedRequest, res, next) => {
    try {
      const institutionId =
        req.user!.role === "INSTITUTION_ADMIN"
          ? await resolveInstitution(req)
          : (req.query.institutionId as string | undefined);
      if (!institutionId) return res.json([]);

      const students = await prisma.student.findMany({
        where: { institutionId },
        include: { applications: true, achievements: true },
      });

      // Minimal PII for coordinators: no contact identifiers beyond what the
      // roster view needs; full contact details stay server-side.
      res.json(
        students.map((s) => ({
          id: s.id,
          fullName: s.fullName,
          educationLevel: s.educationLevel,
          interests: JSON.parse(s.interests || "[]"),
          country: s.country,
          region: s.region,
          applicationCount: s.applications.length,
          achievementCount: s.achievements.length,
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

// GET /institutions/me/coordinators - list coordinator memberships.
institutionsRouter.get(
  "/me/coordinators",
  requireAuth,
  requireRole("INSTITUTION_ADMIN", "PLATFORM_ADMIN", "SUPER_ADMIN"),
  async (req: AuthedRequest, res, next) => {
    try {
      const institutionId = await resolveInstitution(req);
      if (!institutionId) throw new HttpError(404, "No institution linked to this account");

      const memberships = await prisma.coordinatorMembership.findMany({
        where: { institutionId },
        include: { user: { select: { email: true } } },
      });
      res.json(
        memberships.map((m) => ({
          id: m.id,
          email: m.user.email,
          sectors: JSON.parse(m.sectors),
          since: m.createdAt,
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

const coordinatorSchema = z.object({
  email: z.string().email(),
  sectors: z.array(z.string().max(60)).min(1).max(3), // doc §8: 2-3 sectors
});

// POST /institutions/me/coordinators - associate a coordinator (max 4, doc §8).
institutionsRouter.post(
  "/me/coordinators",
  requireAuth,
  requireRole("INSTITUTION_ADMIN"),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = coordinatorSchema.parse(req.body);
      const institutionId = await resolveInstitution(req);
      if (!institutionId) throw new HttpError(404, "No institution linked to this account");

      const count = await prisma.coordinatorMembership.count({ where: { institutionId } });
      if (count >= 4) {
        throw new HttpError(400, "Coordinator limit reached (4) for the base model");
      }

      const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
      if (!user) throw new HttpError(404, "No account with that email — the coordinator must register first");
      if (user.role !== "COORDINATOR") {
        throw new HttpError(400, "That account is not registered as a coordinator");
      }

      const membership = await prisma.coordinatorMembership.create({
        data: {
          userId: user.id,
          institutionId,
          sectors: JSON.stringify(body.sectors),
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorType: "human",
          action: "coordinator.associated",
          targetType: "CoordinatorMembership",
          targetId: membership.id,
          metadata: JSON.stringify({ email: body.email }),
        },
      });

      res.status(201).json({ id: membership.id, email: user.email, sectors: body.sectors });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /institutions/me/coordinators/:id - remove/replace coordinators (doc §8).
institutionsRouter.delete(
  "/me/coordinators/:id",
  requireAuth,
  requireRole("INSTITUTION_ADMIN"),
  async (req: AuthedRequest, res, next) => {
    try {
      const institutionId = await resolveInstitution(req);
      if (!institutionId) throw new HttpError(404, "No institution linked to this account");

      const membership = await prisma.coordinatorMembership.findUnique({
        where: { id: req.params.id },
      });
      if (!membership || membership.institutionId !== institutionId) {
        throw new HttpError(404, "Coordinator membership not found");
      }

      await prisma.coordinatorMembership.delete({ where: { id: membership.id } });
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorType: "human",
          action: "coordinator.removed",
          targetType: "CoordinatorMembership",
          targetId: membership.id,
          metadata: null,
        },
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

const nominateSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1).max(200),
  competitionId: z.string().uuid(),
});

// POST /institutions/me/nominate - bulk-recommend a competition to a set of
// students. Server-side ownership: every studentId must belong to the
// admin's own institution roster (IDOR protection).
institutionsRouter.post(
  "/me/nominate",
  requireAuth,
  requireRole("INSTITUTION_ADMIN"),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = nominateSchema.parse(req.body);
      const institutionId = await resolveInstitution(req);
      if (!institutionId) throw new HttpError(403, "No institution linked to this account");

      const roster = await prisma.student.findMany({
        where: { id: { in: body.studentIds }, institutionId },
        select: { id: true },
      });
      const rosterIds = new Set(roster.map((s) => s.id));
      const foreign = body.studentIds.filter((id) => !rosterIds.has(id));
      if (foreign.length > 0) {
        throw new HttpError(403, `${foreign.length} student(s) are not enrolled at your institution`);
      }

      const applications = await prisma.$transaction(
        body.studentIds.map((studentId) =>
          prisma.application.upsert({
            where: { studentId_competitionId: { studentId, competitionId: body.competitionId } },
            update: {},
            create: { studentId, competitionId: body.competitionId, status: "SAVED" },
          })
        )
      );

      res.status(201).json(applications);
    } catch (err) {
      next(err);
    }
  }
);

// GET /institutions/coordinator/me - coordinator's sector feed (doc §25).
institutionsRouter.get(
  "/coordinator/me",
  requireAuth,
  requireRole("COORDINATOR"),
  async (req: AuthedRequest, res, next) => {
    try {
      const memberships = await prisma.coordinatorMembership.findMany({
        where: { userId: req.user!.id },
        include: { institution: { select: { id: true, name: true } } },
      });
      const sectors = memberships.flatMap((m) => JSON.parse(m.sectors) as string[]);

      const competitions = await prisma.competition.findMany({
        where: { status: "PUBLISHED", deadline: { gt: new Date() } },
        orderBy: { deadline: "asc" },
        take: 100,
      });

      // Sector-filter in JS over the deadline-ordered window (SQLite JSON
      // convention; becomes a Postgres array-overlap query on migration).
      const sectorFeed = competitions.filter((c) => {
        const cats: string[] = JSON.parse(c.category || "[]").map((x: string) => x.toLowerCase());
        return cats.some((cat) => sectors.some((s) => cat.includes(s.toLowerCase())));
      });

      res.json({
        institutions: memberships.map((m) => m.institution),
        sectors,
        competitions: sectorFeed.slice(0, 30).map((c) => ({
          id: c.id,
          title: c.title,
          organizer: c.organizer,
          deadline: c.deadline,
          category: JSON.parse(c.category),
          format: c.format,
          cost: c.cost,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);
