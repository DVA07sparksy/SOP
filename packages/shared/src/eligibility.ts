// Deterministic eligibility evaluation — architecture doc §10: "Use AI to
// extract rules... then evaluate them with deterministic code." AI (the
// eligibility agent) only *writes* the structured rules into
// competition.eligibilityRules; the verdict for a student is always computed
// here, never by a model, and is one of ELIGIBLE / NOT_ELIGIBLE / UNCERTAIN.

import { parseJsonArray } from "./json";

export type EligibilityVerdict = "ELIGIBLE" | "NOT_ELIGIBLE" | "UNCERTAIN";

export interface EligibilitySubject {
  age?: number | null;
  educationLevel?: string | null;
  country?: string | null;
}

export interface EligibilityRules {
  ageMin?: number | null;
  ageMax?: number | null;
  educationLevels?: string[] | null;
  countries?: string[] | null;
}

export interface EligibilityCheck {
  verdict: EligibilityVerdict;
  reasons: string[];
}

const UNIVERSAL_COUNTRY_TOKENS = ["ANY", "GLOBAL", "WORLDWIDE", "*"];

function countryAllowed(rules: EligibilityRules, subject: EligibilitySubject): boolean {
  const countries = (rules.countries ?? []).map((c) => c.trim()).filter(Boolean);
  if (countries.length === 0) return true;
  if (countries.some((c) => UNIVERSAL_COUNTRY_TOKENS.includes(c.toUpperCase()))) return true;
  const studentCountry = (subject.country ?? "").trim().toLowerCase();
  if (!studentCountry) return true; // unknown profile field -> don't fail the student
  return countries.some((c) => c.trim().toLowerCase() === studentCountry);
}

function educationAllowed(rules: EligibilityRules, subject: EligibilitySubject): boolean {
  const levels = (rules.educationLevels ?? []).map((l) => l.trim()).filter(Boolean);
  if (levels.length === 0) return true;
  const level = (subject.educationLevel ?? "").trim().toUpperCase();
  if (!level) return true; // unknown -> uncertain, handled by caller
  return levels.some((l) => l.toUpperCase() === level);
}

export function checkEligibility(subject: EligibilitySubject, rules: EligibilityRules | null): EligibilityCheck {
  if (!rules || typeof rules !== "object") {
    return { verdict: "UNCERTAIN", reasons: ["No structured eligibility rules on record yet."] };
  }

  const reasons: string[] = [];
  let uncertain = false;

  const { ageMin, ageMax } = rules;
  const age = subject.age ?? null;
  if ((ageMin != null || ageMax != null) && age == null) {
    uncertain = true;
    reasons.push("Age requirement exists but your age is not on your profile.");
  } else {
    if (ageMin != null && age != null && age < ageMin) {
      return { verdict: "NOT_ELIGIBLE", reasons: [`Requires age ${ageMin}+; your profile says ${age}.`] };
    }
    if (ageMax != null && age != null && age > ageMax) {
      return { verdict: "NOT_ELIGIBLE", reasons: [`Maximum age is ${ageMax}; your profile says ${age}.`] };
    }
  }

  const levels = (rules.educationLevels ?? []).map((l) => l.trim()).filter(Boolean);
  const level = (subject.educationLevel ?? "").trim().toUpperCase();
  if (levels.length > 0) {
    if (!level) {
      uncertain = true;
      reasons.push("Education-level requirement exists but your profile doesn't state one.");
    } else if (!levels.some((l) => l.toUpperCase() === level)) {
      return {
        verdict: "NOT_ELIGIBLE",
        reasons: [`Restricted to education levels: ${levels.join(", ")}; your profile says ${level || "unknown"}.`],
      };
    }
  }

  const countries = (rules.countries ?? []).map((c) => c.trim()).filter(Boolean);
  const studentCountry = (subject.country ?? "").trim().toLowerCase();
  if (countries.length > 0 && !countries.some((c) => UNIVERSAL_COUNTRY_TOKENS.includes(c.toUpperCase()))) {
    if (!studentCountry) {
      uncertain = true;
      reasons.push("Country restriction exists but your profile doesn't state a country.");
    } else if (!countries.some((c) => c.trim().toLowerCase() === studentCountry)) {
      return {
        verdict: "NOT_ELIGIBLE",
        reasons: [`Restricted to: ${countries.join(", ")}; your profile says ${subject.country}.`],
      };
    }
  }

  if (uncertain) return { verdict: "UNCERTAIN", reasons };
  return { verdict: "ELIGIBLE", reasons: ["Meets all recorded eligibility rules."] };
}

// Kept for the matching engine's hard-filter step and backward compatibility.
export function isEligible(subject: EligibilitySubject, rules: EligibilityRules | null): boolean {
  return checkEligibility(subject, rules).verdict === "ELIGIBLE";
}
