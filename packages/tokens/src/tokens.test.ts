import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { color, font, radius, space, control } from './index.js';

const SOURCE = fileURLToPath(
  new URL('../../../cpf-penpot-handoff/design-tokens.json', import.meta.url),
);

interface ColorEntry {
  $type: 'color';
  $value: string;
}
interface DimensionEntry {
  $type: 'dimension';
  $value: { value: number; unit: string };
}
interface FontFamilyEntry {
  $type: 'fontFamily';
  $value: string[];
}
interface TokenFile {
  color: Record<string, ColorEntry>;
  font: { family: FontFamilyEntry; body: DimensionEntry };
  radius: { control: DimensionEntry; surface: DimensionEntry };
  space: { unit: DimensionEntry };
  control: { minimumTarget: DimensionEntry };
}

const source = JSON.parse(readFileSync(SOURCE, 'utf8')) as TokenFile;

describe('design tokens parity with source of truth', () => {
  it('exposes every source color with the exact hex value', () => {
    const sourceColors = Object.fromEntries(
      Object.entries(source.color).map(([k, v]) => [k, v.$value]),
    );
    expect(color).toEqual(sourceColors);
  });

  it('matches font family and body size', () => {
    expect(font.family).toEqual(source.font.family.$value);
    expect(font.bodyPx).toBe(source.font.body.$value.value);
  });

  it('matches radius, space, and control target dimensions', () => {
    expect(radius.controlPx).toBe(source.radius.control.$value.value);
    expect(radius.surfacePx).toBe(source.radius.surface.$value.value);
    expect(space.unitPx).toBe(source.space.unit.$value.value);
    expect(control.minimumTargetPx).toBe(source.control.minimumTarget.$value.value);
  });

  it('meets the WCAG 2.2 minimum target size (>= 44px)', () => {
    expect(control.minimumTargetPx).toBeGreaterThanOrEqual(44);
  });
});
