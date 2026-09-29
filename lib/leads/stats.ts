import { JOB_TYPES } from "./constants";
import { LEAD_STATUSES, type LeadStatus } from "./schema";
import type { LeadStatRow } from "./store";

export const WEEKS = 12;
const DAY = 86_400_000;
// The studio works in IST, so a "week" starts at Monday midnight in Mumbai, not in UTC.
const IST = 330 * 60_000;

/** Monday 00:00 IST of the week containing `t`, as epoch ms. */
export function weekStart(t: number): number {
  const local = new Date(t + IST);
  const sinceMonday = (local.getUTCDay() + 6) % 7;
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - sinceMonday) - IST;
}

/**
 * A y-axis for counts: a clean top (a 1, 2 or 5 step) and its ticks from zero. Never shorter
 * than 0–4, so a quiet stretch of weeks doesn't draw one enquiry as a full-height bar.
 */
export function niceScale(max: number): { top: number; ticks: number[] } {
  const target = Math.max(4, max) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= target)!;
  const top = Math.ceil(Math.max(4, max) / step) * step;
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) };
}

export type LeadSummary = {
  total: number;
  last30: number;
  byStatus: Record<LeadStatus, number>;
  /** Oldest first; the last entry is the current (partial) week. */
  weekly: { start: number; count: number }[];
  /** Every job type from the form, most asked-for first; anything else stored goes at the end. */
  byJobType: { jobType: string; count: number }[];
  /** won ÷ (won + lost): of the leads with a decision, how many were won. Null before any decision. */
  winRate: number | null;
};

export function summarise(rows: LeadStatRow[], now = Date.now()): LeadSummary {
  const byStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  const jobCounts = new Map<string, number>(JOB_TYPES.map((j) => [j, 0]));
  const thisWeek = weekStart(now);
  const weekly = Array.from({ length: WEEKS }, (_, i) => ({ start: thisWeek - (WEEKS - 1 - i) * 7 * DAY, count: 0 }));
  let last30 = 0;

  for (const row of rows) {
    const t = Date.parse(row.createdAt);
    byStatus[row.status]++;
    jobCounts.set(row.jobType, (jobCounts.get(row.jobType) ?? 0) + 1);
    if (now - t <= 30 * DAY) last30++;
    const w = weekly.findIndex((b) => b.start === weekStart(t));
    if (w >= 0) weekly[w].count++;
  }

  const decided = byStatus.won + byStatus.lost;
  return {
    total: rows.length,
    last30,
    byStatus,
    weekly,
    byJobType: [...jobCounts].map(([jobType, count]) => ({ jobType, count })).sort((a, b) => b.count - a.count),
    winRate: decided ? byStatus.won / decided : null,
  };
}
