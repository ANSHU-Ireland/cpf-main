import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured, ensureBaselineApplied } from '@cpf/db';
import { PgPreferencesRepository } from './preferences-repository.js';
import { getPreferences, replacePreferences } from './preferences.js';

const dbAvailable = isDatabaseConfigured();

const ORG_I = '00000000-0000-0000-0000-0000000000e0';
const USER7 = '00000000-0000-0000-0000-000000000019';

describe.skipIf(!dbAvailable)(
  'preferences against live Postgres (RLS read + audited replace)',
  () => {
    let pool: Pool;

    beforeAll(async () => {
      pool = createPool();
      await ensureBaselineApplied(pool);

      await pool.query(
        `INSERT INTO tenant.organizations (id, slug, legal_name, display_name, status)
           VALUES ($1, 'org-i', 'Org I Ltd', 'Org I', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [ORG_I],
      );
      await pool.query(
        `INSERT INTO iam.users (id, email, display_name, user_type, status)
           VALUES ($1, 'mika@org-i.example', 'Mika', 'employer_user', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [USER7],
      );

      // Deterministic starting state for this mutating test; a legacy non-boolean jsonb entry
      // must be filtered out on read.
      await pool.query('DELETE FROM iam.user_profiles WHERE user_id = $1', [USER7]);
      await pool.query(
        `INSERT INTO iam.user_profiles
           (user_id, locale, timezone, date_format, theme, density, reduced_motion, accessibility_preferences)
         VALUES ($1, 'en-IE', 'Europe/Dublin', 'locale', 'system', 'comfortable', false,
                 '{"highContrast": true, "legacyCount": 3}'::jsonb)`,
        [USER7],
      );
    }, 120_000);

    afterAll(async () => {
      await pool?.end();
    });

    it('reads the caller-own preferences and filters non-boolean accessibility entries', async () => {
      const repository = new PgPreferencesRepository(pool, { role: 'cpf_app' });
      const result = await getPreferences(
        { repository },
        { userId: USER7, tenantId: ORG_I, roles: [] },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.preferences.locale).toBe('en-IE');
        expect(result.preferences.accessibility).toEqual({ highContrast: true });
      }
    });

    it('replaces preferences and writes a chained audit event', async () => {
      const repository = new PgPreferencesRepository(pool, { role: 'cpf_app' });
      const actor = { userId: USER7, tenantId: ORG_I, roles: [] };

      const result = await replacePreferences({ repository }, actor, {
        locale: 'fr-FR',
        timezone: 'Europe/Paris',
        dateFormat: 'DD/MM/YYYY',
        theme: 'dark',
        density: 'compact',
        reducedMotion: true,
        accessibility: { highContrast: false, largeText: true },
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.preferences.theme).toBe('dark');
        expect(result.preferences.accessibility).toEqual({ highContrast: false, largeText: true });
      }

      const row = await pool.query<{ locale: string; reduced_motion: boolean }>(
        'SELECT locale, reduced_motion FROM iam.user_profiles WHERE user_id = $1',
        [USER7],
      );
      expect(row.rows[0]?.locale).toBe('fr-FR');
      expect(row.rows[0]?.reduced_motion).toBe(true);

      const audit = await pool.query<{ event_hash: string }>(
        `SELECT event_hash
           FROM audit.events
          WHERE tenant_id = $1 AND action = 'preferences.update' AND resource_id = $2
          ORDER BY occurred_at DESC, id DESC
          LIMIT 1`,
        [ORG_I, USER7],
      );
      expect(audit.rows[0]?.event_hash).toMatch(/^[0-9a-f]{64}$/);
    });
  },
);
