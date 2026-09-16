function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

// Comma-separated allowlist, e.g. "http://localhost:3000,https://app.example.org".
// "*" (or unset in development) permits any origin — fine for the local MVP,
// lock this down in production.
function allowedOrigins(): string[] | "*" {
  const raw = process.env.CORS_ORIGINS ?? "*";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (raw === "*" || list.length === 0) return "*";
  return list;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: (process.env.NODE_ENV ?? "development") === "production",
  apiPort: Number(process.env.API_PORT ?? 4000),
  corsOrigins: allowedOrigins(),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT ?? "256kb",
  jwtAccessSecret: required("JWT_ACCESS_SECRET", "dev-access-secret"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-secret"),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? "30d",
  webAppUrl: process.env.WEB_APP_URL ?? "http://localhost:3000",
};
