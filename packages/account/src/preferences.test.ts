import { describe, it, expect } from 'vitest';
import { getPreferences, parsePreferencesUpdate, replacePreferences } from './preferences.js';
import type { PreferencesRepository } from './preferences-repository.js';
import type { PreferencesRecord, PreferencesUpdate } from './preferences-types.js';
import type { Actor } from './types.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

function record(over: Partial<PreferencesRecord> = {}): PreferencesRecord {
  return {
    locale: 'en-IE',
    timezone: 'Europe/Dublin',
    dateFormat: 'locale',
    theme: 'system',
    density: 'comfortable',
    reducedMotion: false,
    accessibility: { highContrast: true },
    ...over,
  };
}

const validBody: PreferencesUpdate = {
  locale: 'fr-FR',
  timezone: 'Europe/Paris',
  dateFormat: 'DD/MM/YYYY',
  theme: 'dark',
  density: 'compact',
  reducedMotion: true,
  accessibility: { highContrast: false, largeText: true },
};

function repo(
  read: PreferencesRecord | null,
  onReplace?: (update: PreferencesUpdate) => void,
): PreferencesRepository {
  return {
    readPreferences: () => Promise.resolve(read),
    replacePreferences: (_actor, update) => {
      onReplace?.(update);
      return Promise.resolve(record(update));
    },
  };
}

describe('parsePreferencesUpdate', () => {
  it('accepts a complete, valid body', () => {
    const result = parsePreferencesUpdate(validBody);
    expect(result).toEqual({ ok: true, value: validBody });
  });

  it('rejects unknown top-level properties', () => {
    expect(parsePreferencesUpdate({ ...validBody, bogus: 1 }).ok).toBe(false);
  });

  it('rejects a missing required field', () => {
    const rest: Record<string, unknown> = { ...validBody };
    delete rest.locale;
    expect(parsePreferencesUpdate(rest).ok).toBe(false);
  });

  it('rejects invalid theme and density enums', () => {
    expect(parsePreferencesUpdate({ ...validBody, theme: 'neon' }).ok).toBe(false);
    expect(parsePreferencesUpdate({ ...validBody, density: 'roomy' }).ok).toBe(false);
  });

  it('rejects a non-boolean reducedMotion', () => {
    expect(parsePreferencesUpdate({ ...validBody, reducedMotion: 'yes' }).ok).toBe(false);
  });

  it('rejects non-object and non-boolean accessibility values', () => {
    expect(parsePreferencesUpdate({ ...validBody, accessibility: [] }).ok).toBe(false);
    expect(parsePreferencesUpdate({ ...validBody, accessibility: { x: 1 } }).ok).toBe(false);
  });

  it('rejects a non-object body', () => {
    expect(parsePreferencesUpdate(null).ok).toBe(false);
    expect(parsePreferencesUpdate([]).ok).toBe(false);
  });
});

describe('getPreferences', () => {
  it('projects the stored preferences', async () => {
    const result = await getPreferences({ repository: repo(record()) }, actor);
    expect(result).toEqual({ ok: true, preferences: record() });
  });

  it('returns 404 when the caller has no profile row', async () => {
    const result = await getPreferences({ repository: repo(null) }, actor);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });

  it('denies by default (403) without a read permission', async () => {
    const result = await getPreferences({ repository: repo(record()), permissions: [] }, actor);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});

describe('replacePreferences', () => {
  it('applies the replacement and returns the stored view', async () => {
    let applied: PreferencesUpdate | undefined;
    const result = await replacePreferences(
      { repository: repo(record(), (u) => (applied = u)) },
      actor,
      validBody,
    );
    expect(applied).toEqual(validBody);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preferences.locale).toBe('fr-FR');
    }
  });

  it('denies by default (403) without a write permission', async () => {
    const result = await replacePreferences(
      { repository: repo(record()), permissions: [] },
      actor,
      validBody,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
