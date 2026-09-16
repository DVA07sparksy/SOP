// Discovery Agent (architecture doc §15): SOURCE -> FETCH -> RAW CONTENT ->
// extract queue. Uses the polite crawler (robots.txt, rate limits, size caps)
// and keeps raw content separate from trusted data.

import crypto from "node:crypto";
import { prisma } from "@sop/db";
import { fetchPageText } from "../crawler";
import { sanitizeSourceText } from "../ai";
import { enqueue } from "../enqueue";

export async function runDiscovery(data: { url: string; submittedBy?: string }) {
  const url = new URL(data.url);
  const sourceUrl = url.origin;

  const source = await prisma.source.upsert({
    where: { url: sourceUrl },
    update: {},
    create: { url: sourceUrl },
  });

  const fetched = await fetchPageText(data.url);
  await prisma.source.update({ where: { id: source.id }, data: { lastCheckedAt: new Date() } });

  if (data.submittedBy) {
    await prisma.event.create({
      data: {
        userId: data.submittedBy,
        type: "url_submitted",
        metadata: JSON.stringify({ url: data.url, ok: fetched.ok, error: fetched.error ?? null }),
      },
    });
  }

  if (!fetched.ok || !fetched.text) {
    // Failures are auditable state, not silent skips: admins need to see
    // which sources are unreachable (architecture doc §18).
    await prisma.auditLog.create({
      data: {
        actorType: "system",
        action: "crawl.failed",
        targetType: "Source",
        targetId: source.id,
        metadata: JSON.stringify({ url: data.url, error: fetched.error ?? "no content", status: fetched.status ?? null }),
      },
    });
    return { skipped: true, reason: `fetch failed: ${fetched.error ?? "no content"}` };
  }

  const { text } = sanitizeSourceText(fetched.text);
  const contentHash = crypto.createHash("sha256").update(text).digest("hex");

  const existing = await prisma.rawPage.findFirst({ where: { contentHash } });
  if (existing) {
    return { skipped: true, reason: "unchanged content (idempotency hash match)" };
  }

  const rawPage = await prisma.rawPage.create({
    data: { sourceId: source.id, url: fetched.finalUrl ?? data.url, contentHash, rawText: text },
  });

  await enqueue.extraction({ rawPageId: rawPage.id });
  return { rawPageId: rawPage.id };
}
