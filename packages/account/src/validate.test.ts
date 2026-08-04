import { describe, it, expect } from 'vitest';
import { parseProfileUpdate } from './validate.js';

describe('parseProfileUpdate', () => {
  it('accepts a valid partial patch', () => {
    const result = parseProfileUpdate({ theme: 'dark', reducedMotion: true });
    expect(result).toEqual({ ok: true, value: { theme: 'dark', reducedMotion: true } });
  });

  it('rejects unknown properties', () => {
    const result = parseProfileUpdate({ isAdmin: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('unknown property: isAdmin');
    }
  });

  it('rejects an invalid theme enum', () => {
    const result = parseProfileUpdate({ theme: 'neon' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/theme must be one of/);
    }
  });

  it('rejects a non-boolean reducedMotion', () => {
    const result = parseProfileUpdate({ reducedMotion: 'yes' });
    expect(result.ok).toBe(false);
  });

  it('rejects an empty patch', () => {
    const result = parseProfileUpdate({});
    expect(result).toEqual({ ok: false, errors: ['at least one field must be provided'] });
  });

  it('rejects non-object bodies', () => {
    expect(parseProfileUpdate(null).ok).toBe(false);
    expect(parseProfileUpdate([]).ok).toBe(false);
    expect(parseProfileUpdate('x').ok).toBe(false);
  });

  it('rejects an over-long string field', () => {
    const result = parseProfileUpdate({ preferredName: 'x'.repeat(201) });
    expect(result.ok).toBe(false);
  });
});
