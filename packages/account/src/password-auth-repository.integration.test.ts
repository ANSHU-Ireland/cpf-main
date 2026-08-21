import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import { PgPasswordAuthRepository } from './password-auth-repository.js';

const dbAvailable = isDatabaseConfigured();
const USER_ID = '00000000-0000-4000-8000-00000000a901';
const TENANT_ID = '00000000-0000-4000-8000-00000000a902';
const EMAIL = 'password-auth.integration@cpf.invalid';
const TEMPORARY_PASSWORD = 'CPF-Integration-Temporary-2026!';
const REPLACEMENT_PASSWORD = 'CPF-Integration-Replaced-2026!';

describe.skipIf(!dbAvailable)('PostgreSQL password authentication', () => {
  let pool: Pool;
  let repository: PgPasswordAuthRepository;

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);
    repository = new PgPasswordAuthRepository(pool, { role: 'cpf_app', sessionTtlSeconds: 3_600 });
    await pool.query(
      `INSERT INTO tenant.organizations (id, slug, legal_name, display_name, status)
       VALUES ($1, 'password-auth-integration', 'Password Auth Integration',
               'Password Auth Integration', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID],
    );
    await pool.query(
      `INSERT INTO iam.users
         (id, email, display_name, user_type, status, email_verified_at, mfa_enforced)
       VALUES ($1, $2, 'Password Auth User', 'employer_user', 'active', now(), false)
       ON CONFLICT (id) DO UPDATE SET status = 'active', mfa_enforced = false`,
      [USER_ID, EMAIL],
    );
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM iam.user_sessions WHERE user_id = $1', [USER_ID]);
    await pool.query(
      `INSERT INTO iam.password_credentials
         (user_id, password_hash, reset_required, password_version, last_rotated_at)
       VALUES ($1, crypt($2, gen_salt('bf', 8)), true, 1, now())
       ON CONFLICT (user_id) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         reset_required = true,
         password_version = iam.password_credentials.password_version + 1,
         last_rotated_at = now(),
         updated_at = now()`,
      [USER_ID, TEMPORARY_PASSWORD],
    );
    await pool.query(
      `UPDATE iam.users
          SET status = 'active', failed_login_count = 0, locked_until = NULL
        WHERE id = $1`,
      [USER_ID],
    );
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('rejects invalid credentials and issues only a hashed, expiring session', async () => {
    await expect(
      repository.login({ email: EMAIL, password: 'definitely-wrong' }),
    ).resolves.toBeNull();

    const session = await repository.login({ email: EMAIL, password: TEMPORARY_PASSWORD });
    expect(session).not.toBeNull();
    expect(session?.passwordResetRequired).toBe(true);
    expect(session?.accessToken).toHaveLength(43);

    const stored = await pool.query<{ refresh_token_hash: string }>(
      'SELECT refresh_token_hash FROM iam.user_sessions WHERE id = $1',
      [session?.sessionId],
    );
    expect(stored.rows[0]?.refresh_token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.rows[0]?.refresh_token_hash).not.toContain(session?.accessToken ?? 'missing');
  });

  it('changes the password, clears reset-required and revokes every existing session', async () => {
    const session = await repository.login({ email: EMAIL, password: TEMPORARY_PASSWORD });
    expect(session).not.toBeNull();

    const actor = { userId: USER_ID, tenantId: TENANT_ID, roles: ['employer_admin'] };
    await expect(
      repository.changePassword(actor, {
        currentPassword: TEMPORARY_PASSWORD,
        newPassword: REPLACEMENT_PASSWORD,
      }),
    ).resolves.toBe(true);
    await expect(
      repository.login({ email: EMAIL, password: TEMPORARY_PASSWORD }),
    ).resolves.toBeNull();
    await expect(
      repository.login({ email: EMAIL, password: REPLACEMENT_PASSWORD }),
    ).resolves.toMatchObject({ passwordResetRequired: false });

    const original = await pool.query<{ revoked_at: Date | null }>(
      'SELECT revoked_at FROM iam.user_sessions WHERE id = $1',
      [session?.sessionId],
    );
    expect(original.rows[0]?.revoked_at).not.toBeNull();
  });
});
