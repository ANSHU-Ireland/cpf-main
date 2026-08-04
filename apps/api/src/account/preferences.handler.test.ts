import { describe, it, expect } from 'vitest';
import type {
  Actor,
  GetPreferencesResult,
  ReplacePreferencesResult,
  UserPreferencesDto,
} from '@cpf/account';
import {
  handleGetMePreferences,
  handlePutMePreferences,
  type PreferencesService,
} from './preferences.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

const preferences: UserPreferencesDto = {
  locale: 'en-IE',
  timezone: 'Europe/Dublin',
  dateFormat: 'locale',
  theme: 'system',
  density: 'comfortable',
  reducedMotion: false,
  accessibility: { highContrast: true },
};

const validBody = {
  locale: 'fr-FR',
  timezone: 'Europe/Paris',
  dateFormat: 'DD/MM/YYYY',
  theme: 'dark',
  density: 'compact',
  reducedMotion: true,
  accessibility: { largeText: true },
};

function service(get: GetPreferencesResult, put: ReplacePreferencesResult): PreferencesService {
  return {
    getPreferences: () => Promise.resolve(get),
    replacePreferences: () => Promise.resolve(put),
  };
}

const okGet: GetPreferencesResult = { ok: true, preferences };
const okPut: ReplacePreferencesResult = { ok: true, preferences };

describe('handleGetMePreferences', () => {
  it('returns 200 with the preferences and echoes the correlation id', async () => {
    const res = await handleGetMePreferences(service(okGet, okPut), {
      actor,
      correlationId: 'corr-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-1');
    expect(res.body).toEqual(preferences);
  });

  it('maps a 404 result to problem+json', async () => {
    const res = await handleGetMePreferences(
      service({ ok: false, status: 404, reason: 'preferences not found' }, okPut),
      { actor },
    );
    expect(res.status).toBe(404);
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handleGetMePreferences(
      service({ ok: false, status: 403, reason: 'denied' }, okPut),
      { actor },
    );
    expect(res.status).toBe(403);
  });
});

describe('handlePutMePreferences', () => {
  it('returns 200 with the stored view on success', async () => {
    const res = await handlePutMePreferences(service(okGet, okPut), { actor, body: validBody });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(preferences);
  });

  it('returns 422 problem+json for an invalid body', async () => {
    const res = await handlePutMePreferences(service(okGet, okPut), {
      actor,
      body: { ...validBody, theme: 'neon' },
    });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 403 replace result to problem+json', async () => {
    const res = await handlePutMePreferences(
      service(okGet, { ok: false, status: 403, reason: 'denied' }),
      { actor, body: validBody },
    );
    expect(res.status).toBe(403);
  });
});
