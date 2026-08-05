import { useId, type ReactNode } from 'react';
import { color, space } from '@cpf/tokens';

export interface FieldRenderProps {
  id: string;
  invalid: boolean;
  describedBy: string | undefined;
}

export interface FieldProps {
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string | undefined;
  children: (props: FieldRenderProps) => ReactNode;
}

/**
 * Associates a label (and optional hint/error) with a control via generated ids. The control is
 * rendered through a render-prop so it always receives the matching `id`/`aria-describedby`,
 * preventing orphaned labels.
 */
export function Field({ label, required = false, error, hint, children }: FieldProps): ReactNode {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = error !== undefined && error !== '';
  const describedBy =
    [hint ? hintId : undefined, invalid ? errorId : undefined].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.unitPx }}>
      <label htmlFor={id} style={{ color: color.ink, fontWeight: 600 }}>
        {label}
        {required ? (
          <span aria-hidden="true" style={{ color: color.red }}>
            {' *'}
          </span>
        ) : null}
      </label>
      {hint ? (
        <span id={hintId} style={{ color: color.muted }}>
          {hint}
        </span>
      ) : null}
      {children({ id, invalid, describedBy })}
      {invalid ? (
        <span id={errorId} role="alert" style={{ color: color.red }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
