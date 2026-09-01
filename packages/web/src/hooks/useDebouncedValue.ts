import { useEffect, useState } from 'react';

/** Keeps a fast-changing value (a search box) from driving a request on every
 *  keystroke; the timer is the external system the effect synchronises with. */
export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);

    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};
