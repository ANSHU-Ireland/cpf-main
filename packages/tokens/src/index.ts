/**
 * Design tokens — the single typed source for UI theming.
 *
 * Values are transcribed byte-for-byte from the verified Penpot handoff
 * `cpf-penpot-handoff/design-tokens.json` (WCAG 2.2 AA). `tokens.test.ts` asserts parity with
 * that file so any drift fails CI. Do not edit values here without updating the source token file.
 */

export const color = {
  ink: '#1F2937',
  muted: '#667085',
  line: '#D8DDE5',
  soft: '#F6F4EF',
  paper: '#FFFFFF',
  nav: '#F1EFE9',
  blue: '#2559D6',
  blue_soft: '#EAF0FF',
  sage: '#477A67',
  sage_soft: '#E7F1EC',
  amber: '#A66700',
  amber_soft: '#FFF2D8',
  red: '#B42318',
  red_soft: '#FDECEA',
  purple: '#7047A3',
  purple_soft: '#F2EBFA',
} as const;

export const font = {
  family: ['Public Sans', 'Source Sans 3', 'Arial', 'sans-serif'],
  bodyPx: 15,
} as const;

export const radius = {
  controlPx: 8,
  surfacePx: 10,
} as const;

export const space = {
  /** Base spacing unit (px); multiply for a 4px scale. */
  unitPx: 4,
} as const;

export const control = {
  /** Minimum interactive target size (px) for WCAG 2.2 target-size compliance. */
  minimumTargetPx: 44,
} as const;

export type ColorToken = keyof typeof color;

export const tokens = { color, font, radius, space, control } as const;
