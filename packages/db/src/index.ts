import dotenv from "dotenv";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

// This package is imported from apps running with different cwds; resolve the
// repo root .env deterministically. packages/db/src (or dist) -> root is 3 up.
dotenv.config({ path: join(__dirname, "../../..", ".env") });

// Reuse a single PrismaClient instance across hot reloads / multiple imports
// within the same process (standard Prisma-in-monorepo pattern).
declare global {
  // eslint-disable-next-line no-var
  var __sopPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__sopPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: {
      db: {
        // Resolved from DATABASE_URL when set; otherwise the SQLite file next
        // to the schema (Prisma resolves relative file: URLs against the
        // schema directory, so this is stable from any cwd).
        url: process.env.DATABASE_URL ?? "file:./sop_platform.db",
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.__sopPrisma = prisma;
}

// Roles are plain strings on SQLite (no native enums). Single source of truth
// for authorization checks in the API.
export const Role = {
  STUDENT: "STUDENT",
  INSTITUTION_ADMIN: "INSTITUTION_ADMIN",
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  WORKER: "WORKER",
  COORDINATOR: "COORDINATOR",
} as const;

export * from "@prisma/client";
