/**
 * WCAG contrast-ratio arithmetic (relative luminance → ratio, per the
 * standard formula), kept independent of how a colour was obtained. Any
 * proof script that measures a text/background pair — this one for the
 * public profile page (VI-6/AD-6), later ones for other audited screens —
 * feeds it real `rgb()`/`rgba()` strings read from a live page's
 * `getComputedStyle`, never a hex code copied out of a stylesheet by hand:
 * `color-mix()` results (used throughout global.css for badge tints) only
 * exist once the browser has actually resolved them.
 */

export type RGB = [number, number, number];

/** Parses `rgb(r, g, b)` / `rgba(r, g, b, a)` as returned by
 *  `getComputedStyle` on a real CSS property (`color`, `background-color`),
 *  or a `#rgb`/`#rrggbb` hex string — `getComputedStyle(...).getPropertyValue`
 *  on a *custom* property returns whatever literal was written, hex included,
 *  rather than normalising it the way a real property does. Returns `null`
 *  for `transparent` or an unparsed `rgba(0, 0, 0, 0)`, so callers can walk
 *  up to the next ancestor. */
export const parseCouleurCss = (css: string): RGB | null => {
  const hex = css.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const valeur = hex[1];
    const canaux =
      valeur.length === 3
        ? valeur.split('').map((c) => parseInt(c + c, 16))
        : [valeur.slice(0, 2), valeur.slice(2, 4), valeur.slice(4, 6)].map((c) => parseInt(c, 16));
    return canaux as RGB;
  }

  const correspondance = css.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/,
  );
  if (!correspondance) return null;

  const [, r, g, b, a] = correspondance;
  if (a !== undefined && Number(a) === 0) return null;

  return [Number(r), Number(g), Number(b)];
};

const canalLineaire = (canal: number): number => {
  const normalise = canal / 255;
  return normalise <= 0.04045 ? normalise / 12.92 : ((normalise + 0.055) / 1.055) ** 2.4;
};

/** Relative luminance, WCAG 2.x formula (0 = black, 1 = white). */
export const luminanceRelative = ([r, g, b]: RGB): number => {
  const [rl, gl, bl] = [canalLineaire(r), canalLineaire(g), canalLineaire(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

/** Contrast ratio between two colours, 1 (identical) to 21 (black/white). */
export const ratioContraste = (a: RGB, b: RGB): number => {
  const [l1, l2] = [luminanceRelative(a), luminanceRelative(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/** RGAA/WCAG AA thresholds this project measures against: 4.5:1 for text
 *  (regular size), 3:1 for large text and non-text UI components such as a
 *  focus indicator (WCAG 1.4.11). */
export const SEUIL_TEXTE = 4.5;
export const SEUIL_COMPOSANT = 3;
