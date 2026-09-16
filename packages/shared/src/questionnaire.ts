// Student questionnaire (product doc §11). Short (2-5 min), no right/wrong
// answers. Each answer maps to a deterministic profile-signal adjustment —
// the questionnaire NEVER replaces the eligibility engine; it refines the
// ranking and feeds interests/willingness-to-try into the match engine.

export interface QuestionnaireQuestion {
  id: string;
  question: string;
  type: "single" | "multiple";
  options: { value: string; label: string }[];
  signal: string; // what this measures (doc §65 what_signal_it_measures)
}

export const QUESTIONNAIRE_VERSION = 1;

// Fixed question set (deterministic, i18n-friendly — English labels here,
// French labels can be added as a variant map without changing IDs).
export const QUESTIONNAIRE: QuestionnaireQuestion[] = [
  {
    id: "q_academic_interest",
    question: "Which subjects genuinely interest you? (pick any)",
    type: "multiple",
    options: [
      { value: "mathematics", label: "Mathematics" },
      { value: "physics", label: "Physics" },
      { value: "chemistry", label: "Chemistry" },
      { value: "biology", label: "Biology" },
      { value: "computer science", label: "Computer Science / Programming" },
      { value: "writing", label: "Writing / Literature" },
      { value: "debate", label: "Debate / Public Speaking" },
      { value: "engineering", label: "Engineering / Robotics" },
      { value: "art", label: "Art / Design / Music" },
      { value: "business", label: "Business / Economics" },
    ],
    signal: "academic_interests",
  },
  {
    id: "q_problem_style",
    question: "Which kind of challenge sounds most fun to you?",
    type: "single",
    options: [
      { value: "solving puzzles", label: "Solving tricky puzzles step by step" },
      { value: "building things", label: "Building or inventing something" },
      { value: "research", label: "Researching and explaining an idea" },
      { value: "competing live", label: "Competing live against others" },
      { value: "creating content", label: "Creating stories, art or media" },
    ],
    signal: "problem_solving_preference",
  },
  {
    id: "q_team_preference",
    question: "Do you prefer competing alone or in a team?",
    type: "single",
    options: [
      { value: "INDIVIDUAL", label: "On my own" },
      { value: "TEAM", label: "In a team" },
      { value: "BOTH", label: "Either way" },
    ],
    signal: "format_preference",
  },
  {
    id: "q_comfort_difficulty",
    question: "How do you feel about trying something really hard?",
    type: "single",
    options: [
      { value: "love_hard", label: "I love a big challenge" },
      { value: "try_hard", label: "I'll try if I have time to prepare" },
      { value: "prefer_easier", label: "I prefer starting easier and building up" },
    ],
    signal: "willingness_to_attempt_difficulty",
  },
  {
    id: "q_goal",
    question: "What would you most like to get out of a competition?",
    type: "multiple",
    options: [
      { value: "certificate", label: "A certificate I can show" },
      { value: "cash_prize", label: "Cash or prizes" },
      { value: "travel", label: "Travel / visiting new places" },
      { value: "scholarship", label: "University / scholarship value" },
      { value: "experience", label: "Experience and new skills" },
      { value: "recognition", label: "Recognition for me or my school" },
    ],
    signal: "goals",
  },
  {
    id: "q_time",
    question: "Roughly how much time can you give each week?",
    type: "single",
    options: [
      { value: "low", label: "1–2 hours" },
      { value: "medium", label: "3–5 hours" },
      { value: "high", label: "More than 5 hours" },
    ],
    signal: "preparation_capacity",
  },
];

export interface QuestionnaireAnswers {
  [questionId: string]: string | string[];
}

export interface QuestionnaireSignals {
  interests: string[]; // taxonomy-aligned interest tokens
  goals: string[]; // benefit tokens aligned with Competition.benefits
  willingToAttemptDifficulty: boolean; // doc §18 stretch appetite
  prefersTeam: "INDIVIDUAL" | "TEAM" | "BOTH";
  preparationCapacity: "low" | "medium" | "high";
  problemStyles: string[];
}

function toArray(v: string | string[] | undefined): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export function scoreQuestionnaire(answers: QuestionnaireAnswers): QuestionnaireSignals {
  const interestAnswers = toArray(answers["q_academic_interest"]);
  const styleAnswer = toArray(answers["q_problem_style"]);
  const difficulty = toArray(answers["q_comfort_difficulty"])[0] ?? "try_hard";
  const team = toArray(answers["q_team_preference"])[0] ?? "BOTH";
  const goalAnswers = toArray(answers["q_goal"]);
  const time = toArray(answers["q_time"])[0] ?? "medium";

  return {
    interests: interestAnswers.map((i) => i.toLowerCase()),
    goals: goalAnswers.map((g) => g.toLowerCase()),
    willingToAttemptDifficulty: difficulty !== "prefer_easier",
    prefersTeam: (["INDIVIDUAL", "TEAM", "BOTH"].includes(team) ? team : "BOTH") as
      | "INDIVIDUAL"
      | "TEAM"
      | "BOTH",
    preparationCapacity: (["low", "medium", "high"].includes(time) ? time : "medium") as
      | "low"
      | "medium"
      | "high",
    problemStyles: styleAnswer,
  };
}

// Validate a submission: every known question answered, unknown keys rejected.
export function validateQuestionnaireAnswers(
  answers: unknown
): { ok: true; cleaned: QuestionnaireAnswers } | { ok: false; error: string } {
  if (answers == null || typeof answers !== "object" || Array.isArray(answers)) {
    return { ok: false, error: "Answers must be an object keyed by question id" };
  }
  const cleaned: QuestionnaireAnswers = {};
  for (const q of QUESTIONNAIRE) {
    const raw = (answers as Record<string, unknown>)[q.id];
    if (raw == null) return { ok: false, error: `Missing answer for ${q.id}` };
    if (q.type === "single") {
      if (typeof raw !== "string" || !q.options.some((o) => o.value === raw)) {
        return { ok: false, error: `Invalid answer for ${q.id}` };
      }
      cleaned[q.id] = raw;
    } else {
      if (!Array.isArray(raw) || raw.length === 0 || !raw.every((v) => typeof v === "string" && q.options.some((o) => o.value === v))) {
        return { ok: false, error: `Invalid answer(s) for ${q.id}` };
      }
      cleaned[q.id] = raw as string[];
    }
  }
  // Reject unknown keys (mass-assignment protection).
  for (const key of Object.keys(answers as object)) {
    if (!QUESTIONNAIRE.some((q) => q.id === key)) {
      return { ok: false, error: `Unknown question: ${key}` };
    }
  }
  return { ok: true, cleaned };
}
