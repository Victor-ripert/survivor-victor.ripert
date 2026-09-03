import { useCallback, useState } from 'react';
import type { ZodError } from 'zod';

/**
 * Per-field messages from a Zod failure, keyed on the first path segment so
 * each input can point at its own error with `aria-describedby`.
 */
export const useFormErrors = <Field extends string>() => {
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const fromZod = useCallback((error: ZodError): void => {
    const next: Partial<Record<Field, string>> = {};
    for (const issue of error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !next[key as Field]) next[key as Field] = issue.message;
    }
    setErrors(next);
  }, []);

  const clear = useCallback((field?: Field): void => {
    setErrors((current) => {
      if (!field) return {};
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  return { errors, fromZod, clear };
};
