import { Router } from "express";
import { z } from "zod";
import { authService } from "./auth.service";
import { AuthedRequest, requireAuth } from "../../middleware/auth";
import { rateLimit } from "../../lib/rateLimit";

export const authRouter = Router();

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[a-zA-Z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

const registerSchema = z.object({
  email: z.string().email().max(200),
  password: passwordSchema,
  fullName: z.string().min(2).max(120),
  // Only self-serviceable roles can be requested at signup. ADMIN roles and
  // WORKER are never grantable via the public endpoint (doc §7 privilege
  // separation) — they are assigned by a super-admin in /admin/users.
  role: z.enum(["STUDENT", "COORDINATOR"]).default("STUDENT"),
});

authRouter.post("/register", rateLimit({ windowMs: 60_000, max: 10 }), async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.register(body.email, body.password, body.fullName, body.role);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

authRouter.post("/login", rateLimit({ windowMs: 60_000, max: 10 }), async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const refreshSchema = z.object({ refreshToken: z.string() });

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const body = refreshSchema.parse(req.body);
    const result = await authService.refresh(body.refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout - revoke the presented refresh token (or all sessions).
const logoutSchema = z.object({ refreshToken: z.string().optional(), all: z.boolean().optional() });

authRouter.post("/logout", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = logoutSchema.parse(req.body ?? {});
    const result = await authService.logout(body.refreshToken, req.user!.id, body.all === true);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /auth/change-password - requires current password; revokes all sessions.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});

authRouter.post(
  "/change-password",
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 5 }),
  async (req: AuthedRequest, res, next) => {
    try {
      const body = changePasswordSchema.parse(req.body);
      const result = await authService.changePassword(req.user!.id, body.currentPassword, body.newPassword);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /auth/export - the user's personal data (data-access request path).
authRouter.get("/export", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const data = await authService.exportData(req.user!.id);
    res.setHeader("Content-Disposition", 'attachment; filename="my-data-export.json"');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /auth/me - account deletion; scrubs personal content, revokes sessions.
authRouter.delete("/me", requireAuth, rateLimit({ windowMs: 60_000, max: 3 }), async (req: AuthedRequest, res, next) => {
  try {
    const result = await authService.deleteAccount(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
