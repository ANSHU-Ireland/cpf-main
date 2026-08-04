import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { color, radius, control } from '@cpf/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_BG: Record<ButtonVariant, string> = {
  primary: color.blue,
  secondary: color.paper,
  danger: color.red,
};

const VARIANT_FG: Record<ButtonVariant, string> = {
  primary: color.paper,
  secondary: color.ink,
  danger: color.paper,
};

/** Accessible button: real <button> semantics, visible focus, WCAG 2.2 minimum target size. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', type = 'button', style, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      style={{
        minBlockSize: control.minimumTargetPx,
        minInlineSize: control.minimumTargetPx,
        paddingInline: 16,
        borderRadius: radius.controlPx,
        border: variant === 'secondary' ? `1px solid ${color.line}` : 'none',
        background: VARIANT_BG[variant],
        color: VARIANT_FG[variant],
        fontFamily: 'inherit',
        cursor: rest.disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...rest}
    />
  );
});
