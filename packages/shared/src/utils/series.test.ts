import { fillDailySeries, toIsoDay } from './series.js';

describe('toIsoDay', () => {
  it('keeps the UTC calendar day', () => {
    expect(toIsoDay(new Date('2026-03-08T23:30:00.000Z'))).toBe('2026-03-08');
  });
});

describe('fillDailySeries', () => {
  const endDate = new Date('2026-03-10T15:04:00.000Z');

  it('returns one dense bucket per day, oldest first', () => {
    const series = fillDailySeries(new Map(), 3, endDate);

    expect(series).toEqual([
      { date: '2026-03-08', count: 0 },
      { date: '2026-03-09', count: 0 },
      { date: '2026-03-10', count: 0 },
    ]);
  });

  it('places known counts on their day and zero-fills the gaps', () => {
    const series = fillDailySeries(new Map([['2026-03-09', 4]]), 3, endDate);

    expect(series.map((point) => point.count)).toEqual([0, 4, 0]);
  });

  it('ignores counts outside the window', () => {
    const series = fillDailySeries(new Map([['2026-01-01', 9]]), 2, endDate);

    expect(series.every((point) => point.count === 0)).toBe(true);
  });

  it('crosses a month boundary correctly', () => {
    const series = fillDailySeries(new Map(), 2, new Date('2026-03-01T00:00:00.000Z'));

    expect(series.map((point) => point.date)).toEqual(['2026-02-28', '2026-03-01']);
  });
});
