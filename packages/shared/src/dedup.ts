// Duplicate detection primitives (architecture doc §17): normalized title
// similarity + organizer + URL + deadline, deterministic and testable — never
// an LLM verdict on its own.

export function jaccard(a: string, b: string): number {
  const setA = new Set(
    a
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 1)
  );
  const setB = new Set(
    b
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 1)
  );
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// Cheap normalized-title comparison: collapse whitespace/punctuation, drop
// year tokens so "AI Challenge 2026" vs "AI Challenge (2026)" still match.
export function normalizedTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(?\b20\d{2}\b\)?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function titleSimilarity(a: string, b: string): number {
  const na = normalizedTitle(a);
  const nb = normalizedTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  return jaccard(na, nb);
}

// Compare two URLs ignoring protocol, www, trailing slash, and query/fragment
// noise so official vs application links to the same page still dedupe.
export function urlsEquivalent(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  try {
    const norm = (u: string) => {
      const parsed = new URL(u);
      return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`.toLowerCase();
    };
    return norm(a) === norm(b);
  } catch {
    return false;
  }
}
