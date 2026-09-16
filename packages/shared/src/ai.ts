// AI output is untrusted input (architecture doc §33). Everything a model
// returns is parsed defensively, validated against a schema, and repaired or
// rejected — malformed JSON must never flow into the pipeline.

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface ParsedJson {
  ok: boolean;
  value?: Json;
  error?: string;
}

export function safeJsonParse(raw: string): ParsedJson {
  const text = (raw ?? "").trim();
  if (!text) return { ok: false, error: "empty" };
  try {
    return { ok: true, value: JSON.parse(text) as Json };
  } catch {
    // fall through to repair
  }
  // Common LLM failure modes: ```json fences, leading prose, trailing commas.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const firstBrace = candidate.search(/[[{]/);
  if (firstBrace === -1) return { ok: false, error: "no JSON found" };
  const lastBrace = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
  const slice = candidate.slice(firstBrace, lastBrace + 1).replace(/,\s*([}\]])/g, "$1");
  try {
    return { ok: true, value: JSON.parse(slice) as Json };
  } catch {
    return { ok: false, error: "unparseable JSON" };
  }
}

// Schema shapes used by the agents. Coercion is lenient about types (models
// return "25" or null for numbers) but strict about the final structure.

export interface ExtractionOutput {
  title: string; // guaranteed non-null: validateExtraction returns null without a usable title
  organizer: string | null;
  category: string[];
  eligibility: string | null;
  deadline: string | null;
  countries: string[];
  format: "ONLINE" | "OFFLINE" | "HYBRID" | null;
  benefits: string[];
  applicationUrl: string | null;
  officialUrl: string | null;
  confidence: number;
}

const FORMATS = ["ONLINE", "OFFLINE", "HYBRID"] as const;

function asString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    const lower = t.toLowerCase();
    if (!t || lower === "null" || lower === "unknown" || lower === "not_found" || lower === "n/a") return null;
    return t;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(asString).filter((s): s is string => s != null);
  const s = asString(v);
  if (s) {
    // Model collapsed a list into one comma-separated string.
    return s
      .split(/[,;]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asConfidence(v: unknown): number {
  const n = asNumber(v);
  if (n == null) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function asDateIso(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function asFormat(v: unknown): ExtractionOutput["format"] {
  const s = asString(v)?.toUpperCase();
  return s && (FORMATS as readonly string[]).includes(s) ? (s as ExtractionOutput["format"]) : null;
}

function asUrl(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

// Guards against hallucinated/handcrafted URLs in model output: a link is
// only accepted if its host matches the host of the page the text came from.
export function urlMatchesSource(url: string | null, sourceUrl: string | null | undefined): boolean {
  if (!url) return false;
  if (!sourceUrl) return true; // no provenance to check against
  try {
    return new URL(url).hostname === new URL(sourceUrl).hostname;
  } catch {
    return false;
  }
}

export function validateExtraction(raw: unknown, sourceUrl?: string | null): ExtractionOutput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const title = asString(o.title);
  if (!title) return null; // a competition record without a title is unusable

  const applicationUrl = asUrl(o.applicationUrl);
  const officialUrl = asUrl(o.officialUrl);
  const sourceOk = (u: string | null) => urlMatchesSource(u, sourceUrl);

  return {
    title,
    organizer: asString(o.organizer),
    category: asStringArray(o.category ?? o.categories),
    eligibility: asString(o.eligibility),
    deadline: asDateIso(o.deadline),
    countries: asStringArray(o.countries ?? o.country),
    format: asFormat(o.format),
    benefits: asStringArray(o.benefits),
    applicationUrl: sourceOk(applicationUrl) ? applicationUrl : null,
    officialUrl: sourceOk(officialUrl) ? officialUrl : null,
    confidence: asConfidence(o.confidence),
  };
}

export interface EligibilityRulesOutput {
  ageMin: number | null;
  ageMax: number | null;
  educationLevels: string[];
  countries: string[];
}

export function validateEligibilityRules(raw: unknown): EligibilityRulesOutput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const clampAge = (v: unknown): number | null => {
    const n = asNumber(v);
    if (n == null) return null;
    if (n < 0 || n > 120) return null; // implausible -> drop, don't trust
    return Math.round(n);
  };
  return {
    ageMin: clampAge(o.ageMin),
    ageMax: clampAge(o.ageMax),
    educationLevels: asStringArray(o.educationLevels).map((l) => l.toUpperCase()),
    countries: asStringArray(o.countries),
  };
}

export interface VerificationOutput {
  agrees: boolean;
  confidence: number;
  notes: string | null;
}

export function validateVerification(raw: unknown): VerificationOutput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const agrees = o.agrees;
  if (typeof agrees !== "boolean") return null;
  return { agrees, confidence: asConfidence(o.confidence), notes: asString(o.notes) };
}

// Web content is data, never instructions (architecture doc §33). Wrap fetched
// page text so models treat it as quoted material, and flag classic injection
// patterns for the extraction prompt to be extra skeptical about.
export function sanitizeSourceText(raw: string): { text: string; injectionSuspicion: boolean } {
  const text = raw.slice(0, 60_000); // hard cap on tokens/cost
  const suspicious =
    /ignore (all|any|your) (previous |prior |system )?instructions/i.test(text) ||
    /disregard (your|the) (system )?prompt/i.test(text) ||
    /you are now/i.test(text) ||
    /system\s*:/i.test(text.slice(0, 2000)) ||
    /assistant\s*:/i.test(text.slice(0, 2000));
  return { text, injectionSuspicion: suspicious };
}
