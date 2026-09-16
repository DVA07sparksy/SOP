import dotenv from "dotenv";
import { join } from "path";

// Load .env from the repo root regardless of cwd (apps/api -> root is 3 up).
dotenv.config({ path: join(__dirname, "../../../.env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { env } from "./lib/env";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimit } from "./lib/rateLimit";

import { authRouter } from "./modules/auth/auth.routes";
import { studentsRouter } from "./modules/students/students.routes";
import { competitionsRouter } from "./modules/competitions/competitions.routes";
import { applicationsRouter } from "./modules/applications/applications.routes";
import { institutionsRouter } from "./modules/institutions/institutions.routes";
import { achievementsRouter } from "./modules/achievements/achievements.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { assistantRouter } from "./modules/assistant/assistant.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { questionnaireRouter } from "./modules/questionnaire/questionnaire.routes";
import { teamsRouter } from "./modules/teams/teams.routes";
import { startInlineWorkersIfConfigured } from "./lib/inlineQueue";

const app = express();
app.set("trust proxy", 1); // correct req.ip behind Cloudflare/Vercel proxies

// Security headers. API responses are JSON-only; CSP locks down any accidental
// HTML rendering. HSTS only asserted when the deployment is actually HTTPS.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
        "img-src": ["'self'", "data:"],
      },
    },
    strictTransportSecurity: env.nodeEnv === "production" ? { maxAge: 15552000, includeSubDomains: true } : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);
app.use(compression()); // low-bandwidth users: gzip JSON responses
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: false, // bearer-token auth; cookies not used cross-origin
  })
);
app.use(express.json({ limit: env.jsonBodyLimit }));
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "api", env: env.nodeEnv, queue: process.env.QUEUE_DRIVER ?? "memory" })
);

app.use("/auth", rateLimit({ windowMs: 60_000, max: 20 }), authRouter);
app.use("/students", studentsRouter);
app.use("/competitions", competitionsRouter);
app.use("/applications", applicationsRouter);
app.use("/institutions", institutionsRouter);
app.use("/achievements", achievementsRouter);
app.use("/questionnaire", questionnaireRouter);
app.use("/teams", teamsRouter);
app.use("/admin", adminRouter);
app.use("/notifications", notificationsRouter);
app.use("/assistant", rateLimit({ windowMs: 60_000, max: 15 }), assistantRouter);
app.use("/reports", reportsRouter);

app.use(errorHandler);

app.listen(env.apiPort, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${env.apiPort} (${env.nodeEnv})`);
  void startInlineWorkersIfConfigured();
});
