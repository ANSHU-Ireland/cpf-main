import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import { PgStaffRepository } from './pg-extended-repositories.js';

const dbAvailable = isDatabaseConfigured();
const ORG_ID = '11111111-0000-4000-8000-000000000001';
const ACTOR_ID = '11111111-0000-4000-8000-000000000010';
const USER_ID = '11111111-0000-4000-8000-000000000710';
const MEMBERSHIP_ID = '11111111-0000-4000-8000-000000000711';
const DATA_KEY = 'cpf-platform-staff-repository-test-key-2026';

const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/seeds/northstar-demo.sql',
);

describe.skipIf(!dbAvailable)('platform staff repository against live Postgres', () => {
  let pool: Pool;
  const actor = { userId: ACTOR_ID, tenantId: ORG_ID, roles: ['platform_staff'] };

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);
    await pool.query(await readFile(seedPath, 'utf8'));
    await pool.query(
      `INSERT INTO iam.users (id, email, display_name, user_type, status)
       VALUES ($1, 'platform.repository.test@cpf.invalid', 'Platform Repository Test',
               'cpf_staff', 'active')
       ON CONFLICT (id) DO UPDATE
         SET display_name = EXCLUDED.display_name, user_type = 'cpf_staff', status = 'active'`,
      [USER_ID],
    );
    await pool.query(
      `INSERT INTO iam.memberships (id, tenant_id, user_id, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET status = 'active'`,
      [MEMBERSHIP_ID, ORG_ID, USER_ID],
    );
    await pool.query(
      `INSERT INTO iam.membership_roles
         (membership_id, role_id, scope_type, scope_id, granted_by)
       SELECT $1, role.id, 'platform', $3, $2
         FROM iam.roles AS role
        WHERE role.code = 'platform_staff'
       ON CONFLICT DO NOTHING`,
      [MEMBERSHIP_ID, ACTOR_ID, ORG_ID],
    );
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('lists platform staff and persists role and status changes', async () => {
    const repository = new PgStaffRepository(pool, 'cpf_app', DATA_KEY);
    const listed = await repository.listStaff(actor);
    expect(listed.items.find((staff) => staff.userId === USER_ID)).toMatchObject({
      displayName: 'Platform Repository Test',
      roles: ['platform_staff'],
      status: 'active',
    });

    const roles = await repository.updateRoles(actor, USER_ID, { roles: ['platform_staff'] });
    expect(roles?.roles).toEqual(['platform_staff']);

    const suspended = await repository.updateStatus(actor, USER_ID, {
      status: 'suspended',
      reason: 'Scheduled access review',
    });
    expect(suspended?.status).toBe('suspended');
    const storedStatus = await pool.query<{ status: string }>(
      'SELECT status FROM iam.users WHERE id = $1',
      [USER_ID],
    );
    expect(storedStatus.rows[0]?.status).toBe('disabled');

    const reactivated = await repository.updateStatus(actor, USER_ID, {
      status: 'active',
      reason: 'Access review completed',
    });
    expect(reactivated?.status).toBe('active');
  });

  it('encrypts invitation email and preserves assigned roles across resend and revoke', async () => {
    const repository = new PgStaffRepository(pool, 'cpf_app', DATA_KEY);
    const email = `platform-invite-${Date.now()}@cpf.invalid`;
    const created = await repository.createInvitation(actor, {
      email,
      roles: ['platform_staff'],
    });
    expect(created).toMatchObject({ email, roles: ['platform_staff'], status: 'sent' });

    const stored = await pool.query<{ encrypted_email: Buffer; role_codes: string[] }>(
      'SELECT encrypted_email, role_codes FROM iam.staff_invitations WHERE id = $1',
      [created.id],
    );
    expect(stored.rows[0]?.encrypted_email.toString('utf8')).not.toContain(email);
    expect(stored.rows[0]?.role_codes).toEqual(['platform_staff']);

    const resent = await new PgStaffRepository(pool, 'cpf_app', DATA_KEY).resendInvitation(
      actor,
      created.id,
    );
    expect(resent).toMatchObject({ email, roles: ['platform_staff'], status: 'sent' });
    expect(await repository.revokeInvitation(actor, created.id)).toBe(true);
    expect(await repository.revokeInvitation(actor, created.id)).toBe(false);
  });
});
