import { forwardRef, type InputHTMLAttributes } from 'react';
import { color, radius, control } from '@cpf/tokens';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/** Accessible text input: reflects validity via aria-invalid, WCAG minimum target height. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, style, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      style={{
        minBlockSize: control.minimumTargetPx,
        paddingInline: 12,
        borderRadius: radius.controlPx,
        border: `1px solid ${invalid ? color.red : color.line}`,
        color: color.ink,
        background: color.paper,
        fontFamily: 'inherit',
        ...style,
      }}
      {...rest}
    />
  );
});
