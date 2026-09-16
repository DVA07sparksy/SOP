import { Router } from "express";
import { z } from "zod";
import { prisma } from "@sop/db";
import { computeMatch, parseJsonArray, parseJsonObject, checkEligibility } from "@sop/shared";
import { AuthedRequest, requireAuth } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";
import { enqueue } from "../../lib/queues";

export const competitionsRouter = Router();

const listQuerySchema = z.object({
  category: z.string().max(60).optional(),
  format: z.enum(["ONLINE", "OFFLINE", "HYBRID"]).optional(),
  country: z.string().max(80).optional(),
  educationLevel: z.enum(["SECONDARY", "UNIVERSITY", "GRADUATE", "OTHER"]).optional(),
  freeOnly: z.coerce.boolean().optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /competitions - published catalog, filterable (Opportunity Feed).
// Category/country/education filters are evaluated in JS after a deadline-
// ordered SQL window because SQLite stores them as JSON strings; the filter
// window keeps this efficient and the move to PostgreSQL turns them into
// native jsonb/array containment queries with no API change.
competitionsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const where: any = { status: "PUBLISHED" };
    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { description: { contains: query.q } },
      ];
    }
    if (query.format) where.format = query.format;
    if (query.freeOnly) where.cost = { equals: "free" };

    const PAGE_WINDOW = 500;
    const [rows, total] = await Promise.all([
      prisma.competition.findMany({
        where,
        orderBy: { deadline: "asc" },
        take: PAGE_WINDOW,
      }),
      prisma.competition.count({ where }),
    ]);

    let items = rows;
    if (query.category) {
      const needle = query.category.toLowerCase();
      items = items.filter((c) =>
        parseJsonArray(c.category).some((t) => t.toLowerCase().includes(needle))
      );
    }
    if (query.country) {
      const needle = query.country.toLowerCase();
      items = items.filter((c) => {
        const countries = parseJsonArray(c.countries);
        return (
          countries.length === 0 ||
          countries.some((t) => t.toLowerCase() === needle) ||
          ["any", "worldwide", "global"].includes(needle)
        );
      });
    }
    if (query.educationLevel) {
      const level = query.educationLevel.toUpperCase();
      items = items.filter((c) => {
        const levels = parseJsonArray(c.educationLevels);
        return levels.length === 0 || levels.map((l) => l.toUpperCase()).includes(level);
      });
    }

    const start = (query.page - 1) * query.pageSize;
    const pageItems = items.slice(start, start + query.pageSize).map(serializeCard);

    if (query.q) {
      await prisma.event.create({
        data: { type: "search_performed", metadata: JSON.stringify({ q: query.q, results: items.length }) },
      });
    }

    res.json({ items: pageItems, total, page: query.page, pageSize: query.pageSize });
  } catch (err) {
    next(err);
  }
});

function serializeCard(c: any) {
  return {
    ...c,
    category: parseJsonArray(c.category),
    countries: parseJsonArray(c.countries),
    educationLevels: parseJsonArray(c.educationLevels),
    benefits: parseJsonArray(c.benefits),
    eligibilityRules: undefined, // internal structured rules stay server-side
  };
}

// GET /competitions/for-you - personalized, ranked feed (deterministic engine)
competitionsRouter.get("/for-you", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });
    const candidates = await prisma.competition.findMany({
      where: { status: "PUBLISHED", deadline: { gt: new Date() } },
      take: 200, // pre-filter window; production pushes hard filters into SQL first
    });

    const ranked = candidates
      .map((c) => ({ competition: serializeCard(c), match: computeMatch(student, c) }))
      .filter((r) => r.match.verdict !== "NOT_ELIGIBLE")
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 30);

    await prisma.event.create({
      data: { userId: req.user!.id, type: "recommendation_viewed", metadata: JSON.stringify({ count: ranked.length }) },
    });

    res.json(ranked);
  } catch (err) {
    next(err);
  }
});

// GET /competitions/:id - detail + eligibility verdict for the current user
// (if a valid token is present; public access stays anonymous-friendly).
competitionsRouter.get("/:id", optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    const competition = await prisma.competition.findUnique({
      where: { id: req.params.id },
      include: { source: { select: { url: true, organization: true, reliabilityScore: true } } },
    });
    if (!competition || competition.status !== "PUBLISHED") {
      throw new HttpError(404, "Competition not found");
    }

    let eligibility: {
      verdict: string;
      reasons: string[];
    } | null = null;

    let match = null;
    if (req.user) {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (student) {
        match = computeMatch(student, competition);
        eligibility = checkEligibility(
          { age: student.age, educationLevel: student.educationLevel, country: student.country },
          parseJsonObject(competition.eligibilityRules)
        );
        await prisma.event.create({
          data: {
            userId: req.user.id,
            type: "competition_viewed",
            metadata: JSON.stringify({ competitionId: competition.id }),
          },
        });
      }
    }

    res.json({
      competition: {
        ...serializeCard(competition),
        source: competition.source,
        eligibilityRules: undefined,
      },
      match,
      eligibility,
    });
  } catch (err) {
    next(err);
  }
});

// Parses the bearer token when present, continues anonymously otherwise.
import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../../lib/jwt";
function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(header.slice("Bearer ".length));
      (req as AuthedRequest).user = { id: payload.sub, role: payload.role, email: payload.email };
    } catch {
      // invalid token -> stay anonymous rather than erroring
    }
  }
  next();
}

import { rateLimit } from "../../lib/rateLimit";

const submitLinkSchema = z.object({ url: z.string().url().max(2000) });

// POST /competitions/submit - manual submission path into the discovery pipeline.
// Triggers an expensive crawl+AI job, so it is strictly rate-limited (§20).
competitionsRouter.post(
  "/submit",
  requireAuth,
  rateLimit({ windowMs: 60 * 60_000, max: 10 }),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = submitLinkSchema.parse(req.body);
      await enqueue.crawl({ url: body.url, submittedBy: req.user!.id });
      res.status(202).json({ message: "Submitted for discovery/extraction review" });
    } catch (err) {
      next(err);
    }
  }
);
