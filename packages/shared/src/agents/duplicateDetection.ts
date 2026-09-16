// Duplicate Detection Agent (architecture doc §17): deterministic similarity
// (normalized title + organizer + URL), no LLM verdict. Suspected duplicates
// are flagged for human merge/reject decisions — never auto-merged.

import { prisma } from "@sop/db";
import { jaccard, normalizedTitle, titleSimilarity, urlsEquivalent } from "../dedup";
import { enqueue } from "../enqueue";

const TITLE_SIMILARITY_THRESHOLD = 0.6;

export async function runDuplicateDetection(data: { competitionId: string }) {
  const target = await prisma.competition.findUniqueOrThrow({
    where: { id: data.competitionId },
  });
  const targetCategories = safeArray(target.category);

  const candidates = await prisma.competition.findMany({
    where: {
      id: { not: target.id },
      status: { in: ["PUBLISHED", "EXTRACTED", "NEEDS_REVIEW", "VERIFICATION"] },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  let best: { id: string; score: number } | null = null;

  for (const candidate of candidates) {
    let score = titleSimilarity(target.title, candidate.title);

    // Same normalized organizer adds signal.
    if (
      target.organizer &&
      candidate.organizer &&
      jaccard(target.organizer, candidate.organizer) > 0.8
    ) {
      score = Math.max(score, Math.min(1, score + 0.1));
    }

    // Same official URL is near-conclusive.
    if (urlsEquivalent(target.officialUrl, candidate.officialUrl)) {
      score = 1;
    }

    if (score > TITLE_SIMILARITY_THRESHOLD && (!best || score > best.score)) {
      best = { id: candidate.id, score };
    }
  }

  if (best) {
    await prisma.competition.update({
      where: { id: target.id },
      data: { status: "DUPLICATE_REVIEW", duplicateOfId: best.id },
    });
    await prisma.auditLog.create({
      data: {
        actorType: "ai_agent",
        action: "duplicate.flagged",
        targetType: "Competition",
        targetId: target.id,
        metadata: JSON.stringify({ duplicateOfId: best.id, score: Number(best.score.toFixed(3)) }),
      },
    });
    return { duplicate: true, of: best.id, score: best.score };
  }

  await prisma.competition.update({ where: { id: target.id }, data: { status: "VERIFICATION" } });
  await enqueue.verification({ competitionId: target.id });
  return { duplicate: false };
}

function safeArray(json: string | null): string[] {
  try {
    const v = json ? JSON.parse(json) : [];
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
