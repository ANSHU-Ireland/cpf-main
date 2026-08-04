import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured, ensureBaselineApplied } from '@cpf/db';
import { PgSessionRepository } from './session-repository.js';
import { listSessions } from './list-sessions.js';
import { revokeSession } from './revoke-session.js';

const dbAvailable = isDatabaseConfigured();

const ORG_F = '00000000-0000-0000-0000-00000000000f';
const USER3 = '00000000-0000-0000-0000-000000000013';
const OTHER_USER = '00000000-0000-0000-0000-000000000014';
const SESSION_A = '00000000-0000-0000-0000-0000000000a1';
const SESSION_B = '00000000-0000-0000-0000-0000000000a2';
const OTHER_SESSION = '00000000-0000-0000-0000-0000000000a3';

describe.skipIf(!dbAvailable)(
  'session vertical against live Postgres (RLS + audited revoke)',
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
      await pool.query('GRANT USAGE ON SCHEMA iam, audit TO cpf_app');
      await pool.query('GRANT SELECT, UPDATE ON iam.user_sessions TO cpf_app');
      await pool.query('GRANT SELECT, INSERT ON audit.events TO cpf_app');

      await pool.query(
        `INSERT INTO tenant.organizations (id, slug, legal_name, display_name, status)
         VALUES ($1, 'org-f', 'Org F Ltd', 'Org F', 'active')
       ON CONFLICT (id) DO NOTHING`,
        [ORG_F],
      );
      await pool.query(
        `INSERT INTO iam.users (id, email, display_name, user_type, status)
         VALUES ($1, 'lin@org-f.example', 'Lin', 'employer_user', 'active'),
                ($2, 'max@org-f.example', 'Max', 'employer_user', 'active')
       ON CONFLICT (id) DO NOTHING`,
        [USER3, OTHER_USER],
      );
      await pool.query(
        `INSERT INTO iam.user_sessions (id, user_id, refresh_token_hash, device_label, expires_at)
         VALUES ($1, $4, 'hash-a', 'Chrome', now() + interval '7 days'),
                ($2, $4, 'hash-b', 'Safari', now() + interval '7 days'),
                ($3, $5, 'hash-c', 'Edge',   now() + interval '7 days')
       ON CONFLICT (id) DO NOTHING`,
        [SESSION_A, SESSION_B, OTHER_SESSION, USER3, OTHER_USER],
      );
      // Reset to active so the revoke test is idempotent across repeated runs.
      await pool.query(
        `UPDATE iam.user_sessions
            SET revoked_at = NULL, revocation_reason = NULL
          WHERE id = ANY($1::uuid[])`,
        [[SESSION_A, SESSION_B, OTHER_SESSION]],
      );
    }, 120_000);

    afterAll(async () => {
      await pool?.end();
    });

    it('lists only the caller-own sessions (RLS hides other users)', async () => {
      const repository = new PgSessionRepository(pool, { role: 'cpf_app' });
      const result = await listSessions(
        { repository },
        { userId: USER3, tenantId: ORG_F, roles: [] },
        {
          limit: 25,
          cursor: null,
        },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        const ids = result.page.items.map((s) => s.id);
        expect(ids).toContain(SESSION_A);
        expect(ids).toContain(SESSION_B);
        expect(ids).not.toContain(OTHER_SESSION);
        expect(result.page.total).toBe(2);
      }
    });

    it('revokes an own session and writes a chained audit event', async () => {
      const repository = new PgSessionRepository(pool, { role: 'cpf_app' });
      const actor = { userId: USER3, tenantId: ORG_F, roles: [] };

      const result = await revokeSession({ repository }, actor, SESSION_A, 'user_revoked');
      expect(result).toEqual({ ok: true });

      const row = await pool.query<{ revoked_at: Date | null; revocation_reason: string | null }>(
        'SELECT revoked_at, revocation_reason FROM iam.user_sessions WHERE id = $1',
        [SESSION_A],
      );
      expect(row.rows[0]?.revoked_at).not.toBeNull();
      expect(row.rows[0]?.revocation_reason).toBe('user_revoked');

      const audit = await pool.query<{ resource_id: string; event_hash: string }>(
        `SELECT resource_id, event_hash
         FROM audit.events
        WHERE tenant_id = $1 AND action = 'session.revoke' AND resource_id = $2
        ORDER BY occurred_at DESC, id DESC
        LIMIT 1`,
        [ORG_F, SESSION_A],
      );
      expect(audit.rows[0]?.event_hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('cannot revoke another user session (RLS) → 404', async () => {
      const repository = new PgSessionRepository(pool, { role: 'cpf_app' });
      const result = await revokeSession(
        { repository },
        { userId: USER3, tenantId: ORG_F, roles: [] },
        OTHER_SESSION,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(404);
      }

      // The other user's session remains active.
      const row = await pool.query<{ revoked_at: Date | null }>(
        'SELECT revoked_at FROM iam.user_sessions WHERE id = $1',
        [OTHER_SESSION],
      );
      expect(row.rows[0]?.revoked_at).toBeNull();
    });
  },
);
