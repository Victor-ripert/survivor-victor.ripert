import type { DailyCount } from '../types/recruiter.js';

/** ISO calendar day (UTC) of a timestamp — the bucket key for daily series. */
export const toIsoDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Expands sparse per-day counts into a dense, chronologically ordered series
 * ending on `endDate`, so a chart's x-axis stays evenly spaced across days
 * where nothing happened.
 */
export const fillDailySeries = (
  counts: ReadonlyMap<string, number>,
  days: number,
  endDate: Date,
): DailyCount[] => {
  const series: DailyCount[] = [];
  const cursor = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = toIsoDay(new Date(cursor - offset * 24 * 60 * 60 * 1000));
    series.push({ date: day, count: counts.get(day) ?? 0 });
  }

  return series;
};
