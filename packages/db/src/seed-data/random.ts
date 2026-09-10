/**
 * A tiny seeded PRNG (mulberry32) and a few helpers built on it, so bulk
 * fixture generation (`generated-applicants.ts`) is reproducible: the same
 * seed always produces the same 500-profile dataset, run after run, on
 * whoever's machine runs `npm run db:seed`. `Math.random()` would make
 * every seed run a different dataset, which breaks both the "two identical
 * pagination passes" proof and any comparison between load-test runs.
 */

export type Rng = () => number;

/** Returns a function producing floats in `[0, 1)`, deterministic for a
 *  given `seed`. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in `[min, max]`, both inclusive. */
export const intBetween = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));

export const pick = <T>(rng: Rng, items: readonly T[]): T => {
  const item = items[intBetween(rng, 0, items.length - 1)];
  if (item === undefined) throw new Error('pick() called with an empty array');
  return item;
};

/** Picks `count` distinct items out of `items`, order preserved from the
 *  shuffle rather than from `items` itself. Throws rather than silently
 *  returning fewer than asked for — a pool too small for the requested
 *  count is a fixture bug, not a runtime condition to degrade through. */
export function pickDistinct<T>(rng: Rng, items: readonly T[], count: number): T[] {
  if (count > items.length) {
    throw new Error(`pickDistinct: asked for ${count} distinct items out of only ${items.length}`);
  }

  return shuffled(rng, items).slice(0, count);
}

export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** An 11-character string shaped like a YouTube video id — not a real,
 *  resolvable video, so never embed it as is: `generated-applicants.ts` only
 *  uses it to choose among real ones (`fixtureFor`), which keeps its eleven
 *  draws in the stream. */
export const randomYoutubeId = (rng: Rng): string =>
  Array.from({ length: 11 }, () => pick(rng, ALPHANUMERIC.split(''))).join('');

/** Shaped like a Vimeo id (purely numeric) and, like `randomYoutubeId`, only
 *  ever used to choose among real ones. */
export const randomVimeoId = (rng: Rng): string =>
  String(intBetween(rng, 100_000_000, 999_999_999));
