import { cloneElement, type ReactElement, type ReactNode } from 'react';
import { Icon } from './Icon.js';

interface FormFieldProps {
  id: string;
  label: ReactNode;
  children: ReactElement<Record<string, unknown>>;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
}

/**
 * Label, control, hint and error wired together: the control receives the
 * `id`, `aria-invalid` and an `aria-describedby` pointing at whichever of the
 * hint and the error is rendered, so a screen reader announces them with the
 * field and never needs a visual cue.
 */
export const FormField = ({ id, label, children, hint, error, optional }: FormFieldProps) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {optional && <span className="field__optional"> (facultatif)</span>}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {error && (
        <p className="field__error" id={errorId} role="alert">
          <Icon name="alert" size={16} />
          <span>{error}</span>
        </p>
      )}
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
};
