import { Router } from "express";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@sop/db";
import { AuthedRequest, requireAuth } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";

export const teamsRouter = Router();

const createSchema = z.object({
  name: z.string().min(2).max(80),
  competitionId: z.string().uuid().nullable().optional(),
});

function serializeTeam(team: any, viewerId: string) {
  return {
    id: team.id,
    name: team.name,
    inviteCode: team.ownerId === viewerId ? team.inviteCode : undefined,
    competition: team.competition
      ? { id: team.competition.id, title: team.competition.title }
      : null,
    isOwner: team.ownerId === viewerId,
    members: team.members.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      name: m.user?.student?.fullName ?? m.user?.email ?? "Member",
      email: team.ownerId === viewerId ? m.user?.email : undefined,
      status: m.status,
    })),
    createdAt: team.createdAt,
  };
}

// POST /teams - create a team (doc §23: create, name, invite — not a social network).
teamsRouter.post("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    if (body.competitionId) {
      const competition = await prisma.competition.findUnique({
        where: { id: body.competitionId },
        select: { id: true, status: true },
      });
      if (!competition || competition.status !== "PUBLISHED") {
        throw new HttpError(400, "Competition not found or not published");
      }
    }

    const team = await prisma.team.create({
      data: {
        name: body.name,
        competitionId: body.competitionId ?? null,
        ownerId: req.user!.id,
        inviteCode: randomBytes(8).toString("hex"),
        members: {
          create: { userId: req.user!.id, status: "OWNER", joinedAt: new Date() },
        },
      },
      include: {
        competition: { select: { id: true, title: true } },
        members: { include: { user: { include: { student: { select: { fullName: true } } } } } },
      },
    });

    res.status(201).json(serializeTeam(team, req.user!.id));
  } catch (err) {
    next(err);
  }
});

// GET /teams/mine - teams the user owns or belongs to.
teamsRouter.get("/mine", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        OR: [{ ownerId: req.user!.id }, { members: { some: { userId: req.user!.id } } }],
      },
      include: {
        competition: { select: { id: true, title: true } },
        members: { include: { user: { include: { student: { select: { fullName: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(teams.map((t) => serializeTeam(t, req.user!.id)));
  } catch (err) {
    next(err);
  }
});

const inviteSchema = z.object({ userIds: z.array(z.string().uuid()).min(1).max(20) });

// POST /teams/:id/invitations - owner invites users by id.
teamsRouter.post("/:id/invitations", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id } });
    if (!team) throw new HttpError(404, "Team not found");
    if (team.ownerId !== req.user!.id) throw new HttpError(403, "Only the team owner can invite");

    const body = inviteSchema.parse(req.body);
    const users = await prisma.user.findMany({ where: { id: { in: body.userIds } }, select: { id: true } });
    const validIds = new Set(users.map((u) => u.id));

    await prisma.$transaction(
      body.userIds
        .filter((id) => validIds.has(id))
        .map((userId) =>
          prisma.teamMember.upsert({
            where: { teamId_userId: { teamId: team.id, userId } },
            update: {},
            create: { teamId: team.id, userId, status: "PENDING" },
          })
        )
    );

    res.status(201).json({ invited: body.userIds.filter((id) => validIds.has(id)).length });
  } catch (err) {
    next(err);
  }
});

// POST /teams/join/:inviteCode - join by link (doc §23 invitation links).
teamsRouter.post("/join/:inviteCode", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const team = await prisma.team.findUnique({ where: { inviteCode: req.params.inviteCode } });
    if (!team) throw new HttpError(404, "Invalid invitation code");

    const member = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: req.user!.id } },
      update: { status: "MEMBER", joinedAt: new Date() },
      create: { teamId: team.id, userId: req.user!.id, status: "MEMBER", joinedAt: new Date() },
    });

    res.json({ teamId: team.id, member });
  } catch (err) {
    next(err);
  }
});

// POST /teams/:id/members/:memberId/accept - invited user accepts.
teamsRouter.post("/:id/members/:memberId/accept", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const member = await prisma.teamMember.findUnique({ where: { id: req.params.memberId } });
    if (!member || member.teamId !== req.params.id) throw new HttpError(404, "Invitation not found");
    if (member.userId !== req.user!.id) throw new HttpError(403, "Not your invitation");

    const updated = await prisma.teamMember.update({
      where: { id: member.id },
      data: { status: "MEMBER", joinedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
