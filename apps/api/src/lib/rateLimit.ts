// Lightweight in-memory rate limiter (sliding window per IP+route). Sufficient
// for the MVP and single-instance deployments; swap for Upstash Redis-based
// limiting (or Cloudflare WAF rules) when horizontally scaling.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically sweep expired buckets so the map doesn't grow unbounded.
const SWEEP_INTERVAL_MS = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS).unref?.();

export function rateLimit(opts: { windowMs: number; max: number }) {
  return (req: any, res: any, next: any) => {
    const key = `${req.ip ?? "unknown"}:${req.baseUrl}${req.route?.path ?? req.path}`;
    const now = Date.now();

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }

    bucket.count++;
    res.setHeader("X-RateLimit-Limit", String(opts.max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, opts.max - bucket.count)));
    if (bucket.count > opts.max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: "Too many requests, slow down." });
    }
    next();
  };
}
