export function todayISO(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0]!;
}

export function diffDays(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1).getTime();
  const d2 = new Date(dateStr2).getTime();
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}
