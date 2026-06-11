/** Return today's date in ISO-8601 date format (YYYY-MM-DD). */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]!;
}

/** Add a number of days to a date string and return the resulting ISO date. */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0]!;
}

/** Return the number of calendar days between two ISO date strings (dateStr2 - dateStr1). */
export function diffDays(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1).getTime();
  const d2 = new Date(dateStr2).getTime();
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}
