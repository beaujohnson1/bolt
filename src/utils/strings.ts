// Bullet-proof string utility functions to prevent type errors

export const isStr = (v: unknown): v is string => typeof v === "string";

export function toStr(v: unknown): string {
  return v == null ? "" : String(v);
}

export function safeTrim(v: unknown): string {
  return isStr(v) ? v.trim() : toStr(v).trim();
}

export function safeLower(v: unknown): string {
  return isStr(v) ? v.toLowerCase() : toStr(v).toLowerCase();
}

export function safeUpper(v: unknown): string {
  return isStr(v) ? v.toUpperCase() : toStr(v).toUpperCase();
}

export function safeSlice(v: unknown, start = 0, end?: number): string {
  const s = toStr(v);
  return end == null ? s.slice(start) : s.slice(start, end);
}

export function safeSlug(value: unknown, max = 80): string {
  const s = safeTrim(value).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return s.replace(/^-+|-+$/g, "").slice(0, max);
}

// Helper to normalize "Unknown" strings to null
export function normUnknown(v: unknown): string | null {
  const s = safeTrim(v);
  return s && !/^unknown$/i.test(s) ? s : null;
}

// Safe array operations
export function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? v : [];
}

export function safeStringArray(v: unknown): string[] {
  return safeArray(v).filter(isStr).map(safeTrim).filter(Boolean);
}

// Safe number conversion
export function safeNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (isStr(v)) {
    const parsed = parseFloat(v);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}