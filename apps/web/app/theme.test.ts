import { describe, expect, it } from 'vitest';
import { buildThemeCss } from './theme';

describe('buildThemeCss', () => {
  it('quotes multi-word font families so the browser accepts the intended stack', () => {
    const css = buildThemeCss();

    expect(css).toContain('--font-family: "Public Sans", "Source Sans 3", Arial, sans-serif;');
  });
});
