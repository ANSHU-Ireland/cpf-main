import { color, font, radius, space, control } from '@cpf/tokens';

/**
 * Emits a `:root` CSS custom-property block derived from the single typed token source
 * (`@cpf/tokens`). CSS consumes these via `var(--…)`, so there is no second source of truth to
 * drift from — the token parity test in `packages/tokens` still guards the values.
 */
export function buildThemeCss(): string {
  const vars: Record<string, string> = {
    '--color-ink': color.ink,
    '--color-muted': color.muted,
    '--color-line': color.line,
    '--color-soft': color.soft,
    '--color-paper': color.paper,
    '--color-nav': color.nav,
    '--color-blue': color.blue,
    '--color-blue-soft': color.blue_soft,
    '--color-sage': color.sage,
    '--color-sage-soft': color.sage_soft,
    '--color-amber': color.amber,
    '--color-amber-soft': color.amber_soft,
    '--color-red': color.red,
    '--color-red-soft': color.red_soft,
    '--color-purple': color.purple,
    '--color-purple-soft': color.purple_soft,
    '--font-family': font.family.join(', '),
    '--font-body': `${String(font.bodyPx)}px`,
    '--radius-control': `${String(radius.controlPx)}px`,
    '--radius-surface': `${String(radius.surfacePx)}px`,
    '--space-unit': `${String(space.unitPx)}px`,
    '--target-min': `${String(control.minimumTargetPx)}px`,
  };
  const body = Object.entries(vars)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `:root {\n${body}\n}`;
}
