// Bullet-proof string utility functions to prevent type errors

export const isStr = (v: unknown): v is string => typeof v === "string";

export const toStr = (v: unknown): string =>
  v == null ? "" : (typeof v === "string" ? v : String(v));

export const safeTrim = (v: unknown): string => toStr(v).trim();

export const take = (v: unknown, n: number): string => toStr(v).slice(0, n);

export const safeLower = (v: unknown): string => toStr(v).toLowerCase();

export const safeUpper = (v: unknown): string => toStr(v).toUpperCase();

export const safeSlice = (v: unknown, start = 0, end?: number): string => {
  const s = toStr(v);
  return end == null ? s.slice(start) : s.slice(start, end);
};

// replaces ANY use of .substring()
export const sSub = (v: unknown, start = 0, end?: number): string => {
  const s = toStr(v);
  return end == null ? s.slice(start) : s.slice(start, end);
};

export const safeSlug = (value: unknown, max = 80): string => {
  const s = safeTrim(value).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return s.replace(/^-+|-+$/g, "").slice(0, max);
};

// never persist literal "Unknown"
export const nullIfUnknown = (v: unknown): string | null => {
  const s = safeTrim(v);
  return s && !/^unknown$/i.test(s) ? s : null;
};

// Safe array operations
export const safeArray = <T>(v: unknown): T[] => Array.isArray(v) ? v : [];

export const safeStringArray = (v: unknown): string[] => 
  safeArray(v).filter(isStr).map(safeTrim).filter(Boolean);

// Safe number conversion
export const safeNumber = (v: unknown, fallback = 0): number => {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (isStr(v)) {
    const parsed = parseFloat(v);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

// Helper to normalize "Unknown" strings to null (legacy compatibility)
export const normUnknown = nullIfUnknown;