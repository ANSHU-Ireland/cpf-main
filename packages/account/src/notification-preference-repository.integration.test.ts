import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured, ensureBaselineApplied } from '@cpf/db';
import { PgNotificationPreferenceRepository } from './notification-preference-repository.js';
import {
  listNotificationPreferences,
  updateNotificationPreferences,
} from './notification-preferences.js';

const dbAvailable = isDatabaseConfigured();

const ORG_H = '00000000-0000-0000-0000-0000000000d0';
const USER6 = '00000000-0000-0000-0000-000000000017';
const OTHER_USER = '00000000-0000-0000-0000-000000000018';

describe.skipIf(!dbAvailable)(
  'notification preferences against live Postgres (RLS + audited update + mandatory guard)',
  () => {
    let pool: Pool;

    beforeAll(async () => {
      pool = createPool();
      await ensureBaselineApplied(pool);

      await pool.query(
        `INSERT INTO tenant.organizations (id, slug, legal_name, display_name, status)
           VALUES ($1, 'org-h', 'Org H Ltd', 'Org H', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [ORG_H],
      );
      await pool.query(
        `INSERT INTO iam.users (id, email, display_name, user_type, status)
           VALUES ($1, 'noa@org-h.example', 'Noa', 'employer_user', 'active'),
                  ($2, 'ori@org-h.example', 'Ori', 'employer_user', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [USER6, OTHER_USER],
      );

      // Clean, deterministic starting state for this mutating test.
      await pool.query('DELETE FROM iam.notification_preferences WHERE user_id = ANY($1::uuid[])', [
        [USER6, OTHER_USER],
      ]);
      await pool.query(
        `INSERT INTO iam.notification_preferences (user_id, channel, category, enabled, mandatory)
           VALUES ($1, 'email', 'account_security', true, true),
                  ($1, 'email', 'marketing',        true, false),
                  ($2, 'email', 'marketing',        true, false)`,
        [USER6, OTHER_USER],
      );
    }, 120_000);

    afterAll(async () => {
      await pool?.end();
    });

    it('lists only the caller-own preferences (RLS hides other users)', async () => {
      const repository = new PgNotificationPreferenceRepository(pool, { role: 'cpf_app' });
      const result = await listNotificationPreferences(
        { repository },
        { userId: USER6, tenantId: ORG_H, roles: [] },
        { limit: 25, cursor: null },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.page.total).toBe(2);
        const categories = result.page.items.map((p) => p.category).sort();
        expect(categories).toEqual(['account_security', 'marketing']);
      }
    });

    it('updates a preference and keeps a mandatory one enabled, writing an audit event', async () => {
      const repository = new PgNotificationPreferenceRepository(pool, { role: 'cpf_app' });
      const actor = { userId: USER6, tenantId: ORG_H, roles: [] };

      const result = await updateNotificationPreferences({ repository }, actor, {
        items: [
          { channel: 'email', category: 'marketing', enabled: false, digestFrequency: 'weekly' },
          { channel: 'email', category: 'account_security', enabled: false },
        ],
      });
      expect(result.ok).toBe(true);

      const rows = await pool.query<{
        category: string;
        enabled: boolean;
        digest_frequency: string;
      }>(
        `SELECT category, enabled, digest_frequency
           FROM iam.notification_preferences
          WHERE user_id = $1
          ORDER BY category`,
        [USER6],
      );
      const byCategory = Object.fromEntries(rows.rows.map((r) => [r.category, r]));
      // Mandatory preference stays enabled despite the disable request.
      expect(byCategory.account_security?.enabled).toBe(true);
      // Non-mandatory preference is updated.
      expect(byCategory.marketing?.enabled).toBe(false);
      expect(byCategory.marketing?.digest_frequency).toBe('weekly');

      const audit = await pool.query<{ resource_id: string; event_hash: string }>(
        `SELECT resource_id, event_hash
           FROM audit.events
          WHERE tenant_id = $1 AND action = 'notification_preferences.update' AND resource_id = $2
          ORDER BY occurred_at DESC, id DESC
          LIMIT 1`,
        [ORG_H, USER6],
      );
      expect(audit.rows[0]?.event_hash).toMatch(/^[0-9a-f]{64}$/);
    });
  },
);
