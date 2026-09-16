// Polite crawler used by the Discovery Agent (architecture doc §15):
// robots.txt respected, per-host rate limiting, timeout, response-size cap,
// HTML stripped to text. Deterministic and testable.

import { TextDecoder } from "util";

const DEFAULT_USER_AGENT = "SOPBot/1.0 (+https://example.org/bot; student opportunity discovery)";
const MAX_BYTES = 2_000_000; // 2 MB hard cap per page
const TIMEOUT_MS = 15_000;
const MIN_DELAY_BETWEEN_SAME_HOST_MS = 2_000;

const lastFetchAt = new Map<string, number>();

async function rateLimitDelay(hostname: string): Promise<void> {
  const last = lastFetchAt.get(hostname);
  const now = Date.now();
  if (last && now - last < MIN_DELAY_BETWEEN_SAME_HOST_MS) {
    await new Promise((r) => setTimeout(r, MIN_DELAY_BETWEEN_SAME_HOST_MS - (now - last)));
  }
  lastFetchAt.set(hostname, Date.now());
}

// --- robots.txt ---------------------------------------------------------

interface RobotsRules {
  disallow: string[];
  crawlDelayMs: number | null;
}

const robotsCache = new Map<string, RobotsRules | null>();

async function fetchRobots(origin: string): Promise<RobotsRules | null> {
  if (robotsCache.has(origin)) return robotsCache.get(origin) ?? null;
  let rules: RobotsRules | null = null;
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(5_000),
      headers: { "User-Agent": DEFAULT_USER_AGENT },
    });
    if (res.ok) {
      const body = (await res.text()).slice(0, 100_000);
      rules = parseRobots(body);
    }
  } catch {
    rules = null; // unreachable/unparseable robots.txt -> treat as allowed
  }
  robotsCache.set(origin, rules);
  return rules;
}

export function parseRobots(body: string): RobotsRules {
  const disallow: string[] = [];
  let crawlDelayMs: number | null = null;
  let appliesToUs = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === "user-agent") {
      appliesToUs = value === "*" || value.toLowerCase().includes("sopbot");
    } else if (appliesToUs && key === "disallow") {
      if (value) disallow.push(value);
    } else if (appliesToUs && key === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds)) crawlDelayMs = Math.min(60, seconds) * 1000;
    }
  }
  return { disallow, crawlDelayMs };
}

export function isAllowedByRobots(rules: RobotsRules | null, urlPath: string): boolean {
  if (!rules) return true;
  return !rules.disallow.some((prefix) => prefix !== "" && urlPath.startsWith(prefix));
}

// --- page fetch ---------------------------------------------------------

export interface FetchResult {
  ok: boolean;
  status?: number;
  finalUrl?: string;
  text?: string;
  error?: string;
}

export async function fetchPageText(url: string): Promise<FetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "only http/https URLs are supported" };
  }

  const robots = await fetchRobots(parsed.origin);
  if (!isAllowedByRobots(robots, parsed.pathname)) {
    return { ok: false, error: "disallowed by robots.txt" };
  }

  const delay = robots?.crawlDelayMs ?? 0;
  const minDelay = Math.max(delay, MIN_DELAY_BETWEEN_SAME_HOST_MS);
  const last = lastFetchAt.get(parsed.hostname);
  if (last) {
    const wait = minDelay - (Date.now() - last);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  lastFetchAt.set(parsed.hostname, Date.now());

  try {
    const res = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "Accept-Language": "en,fr;q=0.8", // Cameroon-first: English/French
      },
    });

    if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` };

    const finalUrl = res.url || parsed.toString();

    const buffer = await res.arrayBuffer();
    const slice = buffer.byteLength > MAX_BYTES ? buffer.slice(0, MAX_BYTES) : buffer;
    const contentType = res.headers.get("content-type") ?? "";
    const charsetMatch = contentType.match(/charset=([\w-]+)/i);
    let charset = (charsetMatch?.[1] ?? "utf-8").toLowerCase();
    if (charset === "utf8") charset = "utf-8";
    let decoder: TextDecoder;
    try {
      decoder = new TextDecoder(charset);
    } catch {
      decoder = new TextDecoder("utf-8");
    }
    const html = decoder.decode(slice);

    const isHtml = contentType.includes("html") || /<html[\s>]/i.test(html);
    const text = isHtml ? htmlToText(html) : html;

    return { ok: true, status: res.status, finalUrl, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

// --- HTML -> text ---------------------------------------------------------

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim()
    .slice(0, 60_000);
}
