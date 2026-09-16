// Student AI Assistant (architecture doc §26): grounded ONLY in platform
// data — published competitions, the student's profile, applications and
// saved items. Tools (search/get/eligibility) are implemented as direct data
// functions the agent context provides; the model never invents competitions.

import { prisma } from "@sop/db";
import { modelRouter } from "../router";
import { computeMatch } from "../matching";
import { checkEligibility } from "../eligibility";
import { parseJsonArray, parseJsonObject } from "../json";

const SYSTEM_PROMPT = `You are the Student Opportunity Assistant, focused on student competitions and olympiads.
Answer using ONLY the competition data provided in the context. Always:
- name the specific competitions you reference (id + title),
- include the official/application link when present in context,
- state eligibility caveats using the eligibility verdicts provided,
- say when the data was last verified if known.
Never invent competitions, deadlines, links, or facts not present in the context.`;

export async function runAssistant(data: { userId: string; message: string; kind?: "student" | "admin" }) {
  const student = await prisma.student.findUnique({ where: { userId: data.userId } });

  let context = "No student profile found.";
  let answerableData = "[]";

  if (student) {
    const candidates = await prisma.competition.findMany({
      where: { status: "PUBLISHED", deadline: { gt: new Date() } },
      take: 100,
    });

    const ranked = candidates
      .map((c) => ({ c, match: computeMatch(student, c) }))
      .filter((r) => r.match.eligible)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 10);

    context = JSON.stringify(
      ranked.map((r) => ({
        id: r.c.id,
        title: r.c.title,
        category: parseJsonArray(r.c.category),
        deadline: r.c.deadline,
        cost: r.c.cost,
        officialUrl: r.c.officialUrl,
        applicationUrl: r.c.applicationUrl,
        lastVerifiedAt: r.c.lastVerifiedAt,
        matchScore: r.match.score,
        matchExplanations: r.match.explanations.slice(0, 3),
        eligibility: r.c.eligibilityRawText,
      }))
    );

    const apps = await prisma.application.findMany({
      where: { studentId: student.id, status: { notIn: ["WITHDRAWN", "REJECTED"] } },
      include: { competition: true },
    });
    answerableData = JSON.stringify(
      apps.map((a) => ({
        competitionId: a.competitionId,
        title: a.competition.title,
        status: a.status,
        deadline: a.competition.deadline,
      }))
    );
  }

  const result = await modelRouter.complete({
    task: "assistant_chat",
    system: SYSTEM_PROMPT,
    input: `Student question: ${data.message}

TOP MATCHING COMPETITIONS (JSON): ${context}

STUDENT'S APPLICATIONS (JSON): ${answerableData}`,
  });

  return { reply: result.text, provider: result.provider };
}

// Deterministic eligibility check used by the "check eligibility" tool path
// in the API; exposed here so agents and API share one implementation.
export function eligibilityVerdictFor(
  student: { age: number | null; educationLevel: string; country: string },
  competition: { eligibilityRules: string | null }
) {
  return checkEligibility(student, parseJsonObject(competition.eligibilityRules));
}
