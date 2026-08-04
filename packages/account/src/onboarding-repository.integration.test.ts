import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured, ensureBaselineApplied } from '@cpf/db';
import { PgOnboardingRepository } from './onboarding-repository.js';
import { listOnboarding, updateOnboardingStep } from './onboarding.js';

const dbAvailable = isDatabaseConfigured();

const ORG_J = '00000000-0000-0000-0000-0000000000f0';
const USER8 = '00000000-0000-0000-0000-00000000001a';
const STEP_WELCOME = '00000000-0000-0000-0000-0000000000a1';
const STEP_POLICIES = '00000000-0000-0000-0000-0000000000a2';

describe.skipIf(!dbAvailable)(
  'onboarding against live Postgres (user-scoped list + audited update)',
  () => {
    let pool: Pool;

    beforeAll(async () => {
      pool = createPool();
      await ensureBaselineApplied(pool);

      await pool.query(
        `INSERT INTO tenant.organizations (id, slug, legal_name, display_name, status)
           VALUES ($1, 'org-j', 'Org J Ltd', 'Org J', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [ORG_J],
      );
      await pool.query(
        `INSERT INTO iam.users (id, email, display_name, user_type, status)
           VALUES ($1, 'noa@org-j.example', 'Noa', 'employer_user', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [USER8],
      );

      // Deterministic starting state for this mutating test.
      await pool.query('DELETE FROM iam.onboarding_progress WHERE user_id = $1', [USER8]);
      await pool.query(
        `INSERT INTO iam.onboarding_progress
           (id, user_id, role_code, step_code, material_version, status)
         VALUES ($1, $3, 'employer_user', 'welcome', NULL, 'not_started'),
                ($2, $3, 'employer_user', 'policies', 'v1', 'in_progress')`,
        [STEP_WELCOME, STEP_POLICIES, USER8],
      );
    }, 120_000);

    afterAll(async () => {
      await pool?.end();
    });

    it('lists the caller-own onboarding steps', async () => {
      const repository = new PgOnboardingRepository(pool, { role: 'cpf_app' });
      const result = await listOnboarding(
        { repository },
        { userId: USER8, tenantId: ORG_J, roles: [] },
        { limit: 25, cursor: null },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.page.total).toBe(2);
        expect(result.page.items.map((s) => s.stepCode).sort()).toEqual(['policies', 'welcome']);
      }
    });

    it('updates a step to completed and writes a chained audit event', async () => {
      const repository = new PgOnboardingRepository(pool, { role: 'cpf_app' });
      const actor = { userId: USER8, tenantId: ORG_J, roles: [] };

      const result = await updateOnboardingStep({ repository }, actor, {
        stepCode: 'welcome',
        roleCode: 'employer_user',
        materialVersion: null,
        status: 'completed',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.step.status).toBe('completed');
        expect(result.step.completedAt).not.toBeNull();
      }

      const row = await pool.query<{ status: string; completed_at: Date | null }>(
        'SELECT status, completed_at FROM iam.onboarding_progress WHERE id = $1',
        [STEP_WELCOME],
      );
      expect(row.rows[0]?.status).toBe('completed');
      expect(row.rows[0]?.completed_at).not.toBeNull();

      const audit = await pool.query<{ event_hash: string }>(
        `SELECT event_hash
           FROM audit.events
          WHERE tenant_id = $1 AND action = 'onboarding.step.update' AND resource_id = $2
          ORDER BY occurred_at DESC, id DESC
          LIMIT 1`,
        [ORG_J, STEP_WELCOME],
      );
      expect(audit.rows[0]?.event_hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns 404 when no step matches (no row invented)', async () => {
      const repository = new PgOnboardingRepository(pool, { role: 'cpf_app' });
      const result = await updateOnboardingStep(
        { repository },
        { userId: USER8, tenantId: ORG_J, roles: [] },
        {
          stepCode: 'does-not-exist',
          roleCode: 'employer_user',
          materialVersion: null,
          status: 'completed',
        },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(404);
      }
    });
  },
);
