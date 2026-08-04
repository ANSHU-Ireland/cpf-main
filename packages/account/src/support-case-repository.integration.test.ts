import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured, ensureBaselineApplied } from '@cpf/db';
import { PgSupportCaseRepository } from './support-case-repository.js';
import { createSupportCase, listSupportCases } from './support-cases.js';

const dbAvailable = isDatabaseConfigured();

const ORG_K = '00000000-0000-0000-0000-000000000100';
const USER9 = '00000000-0000-0000-0000-00000000001b';
const OTHER_USER = '00000000-0000-0000-0000-00000000001c';

describe.skipIf(!dbAvailable)(
  'support cases against live Postgres (requester-scoped list + audited create)',
  () => {
    let pool: Pool;

    beforeAll(async () => {
      pool = createPool();
      await ensureBaselineApplied(pool);

      await pool.query(
        `INSERT INTO tenant.organizations (id, slug, legal_name, display_name, status)
           VALUES ($1, 'org-k', 'Org K Ltd', 'Org K', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [ORG_K],
      );
      await pool.query(
        `INSERT INTO iam.users (id, email, display_name, user_type, status)
           VALUES ($1, 'ravi@org-k.example', 'Ravi', 'employer_user', 'active'),
                  ($2, 'other@org-k.example', 'Other', 'employer_user', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [USER9, OTHER_USER],
      );

      // Deterministic starting state for this mutating test.
      await pool.query('DELETE FROM support.cases WHERE requester_user_id = ANY($1::uuid[])', [
        [USER9, OTHER_USER],
      ]);
      // A case owned by another requester in the same tenant must never surface for USER9.
      await pool.query(
        `INSERT INTO support.cases
           (tenant_id, requester_user_id, case_reference, category, severity, subject,
            description, purpose, status)
         VALUES ($1, $2, 'SC-OTHER-SEED', 'billing', 'low', 'Other subject',
                 'Other description', 'Other purpose', 'open')`,
        [ORG_K, OTHER_USER],
      );
    }, 120_000);

    afterAll(async () => {
      await pool?.end();
    });

    it('creates a case, returns the stored view, and writes a chained audit event', async () => {
      const repository = new PgSupportCaseRepository(pool, { role: 'cpf_app' });
      const actor = { userId: USER9, tenantId: ORG_K, roles: [] };

      const result = await createSupportCase({ repository }, actor, {
        category: 'account_access',
        severity: 'high',
        subject: 'Cannot sign in',
        description: 'MFA loop after reset.',
        purpose: 'Restore account access.',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.supportCase.status).toBe('open');
      expect(result.supportCase.caseReference).toMatch(/^SC-/);

      const row = await pool.query<{ requester_user_id: string; tenant_id: string }>(
        'SELECT requester_user_id, tenant_id FROM support.cases WHERE id = $1',
        [result.supportCase.id],
      );
      expect(row.rows[0]?.requester_user_id).toBe(USER9);
      expect(row.rows[0]?.tenant_id).toBe(ORG_K);

      const audit = await pool.query<{ event_hash: string }>(
        `SELECT event_hash
           FROM audit.events
          WHERE tenant_id = $1 AND action = 'support_case.create' AND resource_id = $2
          ORDER BY occurred_at DESC, id DESC
          LIMIT 1`,
        [ORG_K, result.supportCase.id],
      );
      expect(audit.rows[0]?.event_hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('lists only the caller-own cases (never another requester in the tenant)', async () => {
      const repository = new PgSupportCaseRepository(pool, { role: 'cpf_app' });
      const result = await listSupportCases(
        { repository },
        { userId: USER9, tenantId: ORG_K, roles: [] },
        { limit: 25, cursor: null },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.page.total).toBe(1);
        expect(result.page.items.every((c) => c.caseReference !== 'SC-OTHER-SEED')).toBe(true);
      }
    });
  },
);
