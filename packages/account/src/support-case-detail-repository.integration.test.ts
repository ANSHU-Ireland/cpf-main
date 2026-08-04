import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured, ensureBaselineApplied } from '@cpf/db';
import { PgSupportCaseDetailRepository } from './support-case-detail-repository.js';
import { addSupportMessage, getSupportCase } from './support-case-detail.js';

const dbAvailable = isDatabaseConfigured();

const ORG_L = '00000000-0000-0000-0000-000000000200';
const USER10 = '00000000-0000-0000-0000-00000000001d';
const OTHER10 = '00000000-0000-0000-0000-00000000001e';
const CASE_ID = '00000000-0000-0000-0000-0000000002a1';
const OTHER_CASE = '00000000-0000-0000-0000-0000000002a2';

describe.skipIf(!dbAvailable)(
  'support case detail + messages against live Postgres (requester scope + visibility filter)',
  () => {
    let pool: Pool;

    beforeAll(async () => {
      pool = createPool();
      await ensureBaselineApplied(pool);

      await pool.query(
        `INSERT INTO tenant.organizations (id, slug, legal_name, display_name, status)
           VALUES ($1, 'org-l', 'Org L Ltd', 'Org L', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [ORG_L],
      );
      await pool.query(
        `INSERT INTO iam.users (id, email, display_name, user_type, status)
           VALUES ($1, 'sam@org-l.example', 'Sam', 'employer_user', 'active'),
                  ($2, 'nina@org-l.example', 'Nina', 'employer_user', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [USER10, OTHER10],
      );

      // Deterministic starting state for this mutating test.
      await pool.query('DELETE FROM support.case_messages WHERE case_id = ANY($1::uuid[])', [
        [CASE_ID, OTHER_CASE],
      ]);
      await pool.query('DELETE FROM support.cases WHERE id = ANY($1::uuid[])', [
        [CASE_ID, OTHER_CASE],
      ]);

      await pool.query(
        `INSERT INTO support.cases
           (id, tenant_id, requester_user_id, case_reference, category, severity, subject,
            description, purpose, status)
         VALUES ($1, $2, $3, 'SC-DETAIL-SEED', 'account_access', 'high', 'Locked out',
                 'MFA loop.', 'Restore access.', 'open'),
                ($4, $2, $5, 'SC-OTHER-DETAIL', 'billing', 'low', 'Other subject',
                 'Other description', 'Other purpose', 'open')`,
        [CASE_ID, ORG_L, USER10, OTHER_CASE, OTHER10],
      );
      await pool.query(
        `INSERT INTO support.case_messages
           (tenant_id, case_id, author_user_id, visibility, body)
         VALUES ($1, $2, $3, 'requester', 'REQ-VISIBLE'),
                ($1, $2, $3, 'internal',  'INTERNAL-SECRET')`,
        [ORG_L, CASE_ID, USER10],
      );
    }, 120_000);

    afterAll(async () => {
      await pool?.end();
    });

    it('returns the case with only requester-visible messages (never internal)', async () => {
      const repository = new PgSupportCaseDetailRepository(pool, { role: 'cpf_app' });
      const result = await getSupportCase(
        { repository },
        { userId: USER10, tenantId: ORG_L, roles: [] },
        CASE_ID,
        { limit: 25, cursor: null },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.detail.id).toBe(CASE_ID);
        expect(result.detail.messages.total).toBe(1);
        const bodies = result.detail.messages.items.map((m) => m.body);
        expect(bodies).toContain('REQ-VISIBLE');
        expect(bodies).not.toContain('INTERNAL-SECRET');
      }
    });

    it('adds a requester message and writes a chained audit event', async () => {
      const repository = new PgSupportCaseDetailRepository(pool, { role: 'cpf_app' });
      const result = await addSupportMessage(
        { repository },
        { userId: USER10, tenantId: ORG_L, roles: [] },
        CASE_ID,
        { body: 'Any progress?' },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.message.body).toBe('Any progress?');

      const row = await pool.query<{ visibility: string; author_user_id: string }>(
        'SELECT visibility, author_user_id FROM support.case_messages WHERE id = $1',
        [result.message.id],
      );
      expect(row.rows[0]?.visibility).toBe('requester');
      expect(row.rows[0]?.author_user_id).toBe(USER10);

      const audit = await pool.query<{ event_hash: string }>(
        `SELECT event_hash
           FROM audit.events
          WHERE tenant_id = $1 AND action = 'support_case.message.create' AND resource_id = $2
          ORDER BY occurred_at DESC, id DESC
          LIMIT 1`,
        [ORG_L, result.message.id],
      );
      expect(audit.rows[0]?.event_hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('reports 404 for a case owned by another requester in the same tenant', async () => {
      const repository = new PgSupportCaseDetailRepository(pool, { role: 'cpf_app' });
      const result = await getSupportCase(
        { repository },
        { userId: USER10, tenantId: ORG_L, roles: [] },
        OTHER_CASE,
        { limit: 25, cursor: null },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(404);
      }
    });
  },
);
