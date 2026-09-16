// SQLite (the MVP driver) has no native arrays/objects, so the schema stores
// them as JSON strings. These helpers are the single place that convention is
// interpreted; when the datasource moves to PostgreSQL the fields become real
// jsonb/arrays and only these functions (plus Prisma's generated types) change.

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseJsonObject<T = Record<string, unknown>>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}
