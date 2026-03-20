/**
 * Safe date parsing utilities.
 *
 * HTML date inputs return "YYYY-MM-DD" (no time), which JS interprets as UTC.
 * In UTC-5 (Colombia), this shifts the date back one day. We parse as local.
 */

/** Parse "YYYY-MM-DD" as local date (not UTC). */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

/** Safe Date from any string — ISO timestamps stay as-is, bare dates go local. */
export function safeDate(value: string): Date {
  if (!value) return new Date(NaN);
  if (value.includes("T")) return new Date(value);
  return parseLocalDate(value);
}

/** Format date for display, returns "—" for invalid dates. */
export function formatDate(
  date: Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString(
    "es-CO",
    options ?? { year: "numeric", month: "short", day: "numeric" },
  );
}
