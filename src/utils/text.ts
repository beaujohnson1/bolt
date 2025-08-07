import { take, safeLower, toStr } from './strings';

// Safe text preview utility
export const preview = (v: unknown, n = 80): string => take(v, n);

// Safe slug generation utility
export const slug = (v: unknown, n = 80): string =>
  safeLower(v).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, n);

// Safe title truncation for display
export const truncateTitle = (v: unknown, maxLength = 50): string => {
  const text = toStr(v);
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
};

// Safe description preview
export const previewDescription = (v: unknown, maxLength = 100): string => {
  const text = toStr(v);
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
};