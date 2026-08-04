import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured, ensureBaselineApplied } from '@cpf/db';
import { PgSecurityEventRepository } from './security-event-repository.js';
import { listSecurityEvents } from './list-security-events.js';

const dbAvailable = isDatabaseConfigured();

const ORG_G = '00000000-0000-0000-0000-0000000000f0';
const USER5 = '00000000-0000-0000-0000-000000000015';
const OTHER_USER = '00000000-0000-0000-0000-000000000016';
const EVENT_1 = '00000000-0000-0000-0000-0000000000b1';
const EVENT_2 = '00000000-0000-0000-0000-0000000000b2';
const OTHER_EVENT = '00000000-0000-0000-0000-0000000000b3';

describe.skipIf(!dbAvailable)(
  'security-events feed against live Postgres (explicit user scope)',
  () => {
    let pool: Pool;

    beforeAll(async () => {
      pool = createPool();
      await ensureBaselineApplied(pool);

      await pool.query(
        `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cpf_app') THEN
           CREATE ROLE cpf_app NOSUPERUSER;
         END IF;
       END $$;`,
      );
      await pool.query('GRANT USAGE ON SCHEMA iam TO cpf_app');
      await pool.query('GRANT SELECT ON iam.account_security_events TO cpf_app');

      await pool.query(
        `INSERT INTO tenant.organizations (id, slug, legal_name, display_name, status)
         VALUES ($1, 'org-g', 'Org G Ltd', 'Org G', 'active')
       ON CONFLICT (id) DO NOTHING`,
        [ORG_G],
      );
      await pool.query(
        `INSERT INTO iam.users (id, email, display_name, user_type, status)
         VALUES ($1, 'sam@org-g.example', 'Sam', 'employer_user', 'active'),
                ($2, 'kim@org-g.example', 'Kim', 'employer_user', 'active')
       ON CONFLICT (id) DO NOTHING`,
        [USER5, OTHER_USER],
      );
      await pool.query(
        `INSERT INTO iam.account_security_events (id, user_id, event_type, outcome, occurred_at)
         VALUES ($1, $4, 'password_changed', 'success', now() - interval '2 hours'),
                ($2, $4, 'mfa_enrolled',     'success', now() - interval '1 hour'),
                ($3, $5, 'sign_in',          'success', now())
       ON CONFLICT (id) DO NOTHING`,
        [EVENT_1, EVENT_2, OTHER_EVENT, USER5, OTHER_USER],
      );
    }, 120_000);

    afterAll(async () => {
      await pool?.end();
    });

    it('returns only the caller-own events, newest first', async () => {
      const repository = new PgSecurityEventRepository(pool, { role: 'cpf_app' });
      const result = await listSecurityEvents(
        { repository },
        { userId: USER5, tenantId: ORG_G, roles: [] },
        { limit: 25, cursor: null },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        const ids = result.page.items.map((e) => e.id);
        expect(ids).toEqual([EVENT_2, EVENT_1]);
        expect(ids).not.toContain(OTHER_EVENT);
        expect(result.page.total).toBe(2);
      }
    });

    it('paginates by keyset cursor', async () => {
      const repository = new PgSecurityEventRepository(pool, { role: 'cpf_app' });
      const actor = { userId: USER5, tenantId: ORG_G, roles: [] };

      const first = await listSecurityEvents({ repository }, actor, { limit: 1, cursor: null });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.page.items.map((e) => e.id)).toEqual([EVENT_2]);
      expect(first.page.nextCursor).not.toBeNull();

      const decoded = JSON.parse(
        Buffer.from(first.page.nextCursor as string, 'base64url').toString(),
      );
      const second = await listSecurityEvents({ repository }, actor, {
        limit: 1,
        cursor: decoded,
      });
      expect(second.ok).toBe(true);
      if (second.ok) {
        expect(second.page.items.map((e) => e.id)).toEqual([EVENT_1]);
      }
    });
  },
);
