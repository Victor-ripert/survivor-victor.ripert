import type { SVGProps } from 'react';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number;
}

type IconName =
  | 'play'
  | 'check'
  | 'alert'
  | 'info'
  | 'clock'
  | 'star'
  | 'star-filled'
  | 'arrow-left'
  | 'arrow-right'
  | 'close'
  | 'eye'
  | 'person'
  | 'video'
  | 'badge';

const PATHS: Record<IconName, string> = {
  play: 'M8 5v14l11-7z',
  check: 'M20 6L9 17l-5-5',
  alert: 'M12 8v4M12 16h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  info: 'M12 8h.01M11 12h1v4h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  star: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19l1-5.8L3.5 9.2l5.9-.9z',
  'star-filled': 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19l1-5.8L3.5 9.2l5.9-.9z',
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  close: 'M18 6L6 18M6 6l12 12',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  person: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 3.6-7 8-7s8 3 8 7',
  video: 'M3 8a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 10l5-3v10l-5-3z',
  badge: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19l1-5.8L3.5 9.2l5.9-.9z',
};

const FILLED: ReadonlySet<IconName> = new Set(['play', 'star-filled']);

/**
 * One stroke-based icon set on a 24px grid, drawn inline so it scales and
 * inherits `currentColor`. Decorative by default: pass `aria-label` (and drop
 * `aria-hidden`) when the icon is the only content of a control.
 */
export const Icon = ({ name, size = 16, ...rest }: IconProps & { name: IconName }) => {
  const filled = FILLED.has(name);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
};
