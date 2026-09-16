import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma, Role } from "@sop/db";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt";
import { HttpError } from "../../middleware/errorHandler";

export const authService = {
  async register(email: string, password: string, fullName: string, role: string = Role.STUDENT) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, "Email already registered");

    // Defense in depth: the route schema already restricts this, but the
    // service never trusts its callers for privilege assignment.
    const safeRole = role === Role.COORDINATOR ? Role.COORDINATOR : Role.STUDENT;

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: safeRole,
        ...(safeRole === Role.STUDENT
          ? {
              student: {
                create: {
                  // Minimal viable profile; progressive onboarding fills the
                  // rest (architecture doc §6). Cameroon-first default, fully
                  // editable, nothing hard-coded elsewhere.
                  fullName,
                  educationLevel: "UNIVERSITY",
                  country: "Cameroon",
                  fieldOfStudy: JSON.stringify([]),
                  interests: JSON.stringify([]),
                  skills: JSON.stringify([]),
                  careerInterests: JSON.stringify([]),
                  preferredFormats: JSON.stringify([]),
                },
              },
            }
          : {}),
      },
    });

    return authService.issueTokens(user.id, user.role, user.email);
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) throw new HttpError(401, "Invalid credentials");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new HttpError(401, "Invalid credentials");

    return authService.issueTokens(user.id, user.role, user.email);
  },

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new HttpError(401, "Invalid refresh token");
    }

    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const stored = await prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash, revoked: false, expiresAt: { gt: new Date() } },
    });
    if (!stored) throw new HttpError(401, "Refresh token not recognized");

    const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    return authService.issueTokens(user.id, user.role, user.email);
  },

  // Logout = revoke the presented refresh token (and optionally every
  // session for this user, e.g. after a password change).
  async logout(refreshToken: string | undefined, userId: string, revokeAll: boolean) {
    if (revokeAll) {
      await prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
      return { ok: true, revokedAll: true };
    }
    if (refreshToken) {
      const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
      await prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revoked: false },
        data: { revoked: true },
      });
    }
    return { ok: true, revokedAll: false };
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new HttpError(400, "Password auth not available for this account");

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new HttpError(401, "Current password is incorrect");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Invalidate every existing session after a password change.
      prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } }),
    ]);
    return authService.issueTokens(user.id, user.role, user.email);
  },

  // GDPR-style export: everything the platform stores about this person,
  // with internal identifiers preserved for continuity.
  async exportData(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: {
          include: {
            applications: { include: { competition: { select: { id: true, title: true, deadline: true, officialUrl: true } } } },
            achievements: { include: { competition: { select: { id: true, title: true } } } },
          },
        },
        reports: { select: { id: true, reason: true, message: true, createdAt: true, resolved: true } },
      },
    });
    if (!user) throw new HttpError(404, "Account not found");

    return {
      exportedAt: new Date().toISOString(),
      account: { email: user.email, role: user.role, createdAt: user.createdAt },
      profile: user.student,
      reports: user.reports,
      note: "This export contains all personal data stored by the platform for your account.",
    };
  },

  // Account deletion: scrub personal content, anonymize records that must
  // persist for integrity (reports the user filed), revoke sessions.
  async deleteAccount(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { student: true } });
    if (!user) throw new HttpError(404, "Account not found");

    await prisma.$transaction(async (tx) => {
      if (user.student) {
        await tx.application.deleteMany({ where: { studentId: user.student.id } });
        await tx.achievement.deleteMany({ where: { studentId: user.student.id } });
        await tx.student.delete({ where: { id: user.student.id } });
      }
      // Anonymize filed reports rather than deleting them (integrity of
      // moderation history): reportedById is SetNull in the schema.
      await tx.report.updateMany({
        where: { reportedById: userId },
        data: { message: null },
      });
      await tx.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
      await tx.event.deleteMany({ where: { userId } });
      await tx.auditLog.create({
        data: {
          actorId: null,
          actorType: "human",
          action: "account.deleted",
          targetType: "user",
          targetId: userId,
          metadata: JSON.stringify({ emailHash: crypto.createHash("sha256").update(user.email).digest("hex").slice(0, 12) }),
        },
      });
      await tx.user.delete({ where: { id: userId } });
    });

    return { ok: true };
  },

  async issueTokens(userId: string, role: string, email: string) {
    const accessToken = signAccessToken({ sub: userId, role, email });
    const refreshToken = signRefreshToken(userId);
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    return { accessToken, refreshToken, user: { id: userId, role, email } };
  },
};
