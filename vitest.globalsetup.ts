import 'dotenv/config';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';

/**
 * One-time database provisioning for integration tests.
 *
 * Runs once in the Vitest main process before any worker starts, so the
 * `cpf_app` role and its grants are created serially. Doing this per test file
 * caused concurrent `CREATE ROLE`/`GRANT` DDL to race on shared catalog tuples
 * ("tuple concurrently updated"). Individual tests keep only their data seeding.
 */
export async function setup(): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  const pool = createPool();
  try {
    await ensureBaselineApplied(pool);

    // Least-privilege, non-superuser role so FORCE ROW LEVEL SECURITY is enforced.
    await pool.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cpf_app') THEN
           CREATE ROLE cpf_app NOSUPERUSER;
         END IF;
       END $$;`,
    );

    await pool.query('GRANT USAGE ON SCHEMA tenant, iam, audit, support TO cpf_app');
    await pool.query('GRANT SELECT ON tenant.organizations TO cpf_app');
    await pool.query('GRANT SELECT ON tenant.departments TO cpf_app');
    await pool.query(
      'GRANT SELECT ON iam.users, iam.memberships, iam.membership_roles, iam.roles TO cpf_app',
    );
    await pool.query('GRANT SELECT, INSERT, UPDATE ON iam.user_profiles TO cpf_app');
    await pool.query('GRANT SELECT, UPDATE ON iam.user_sessions TO cpf_app');
    await pool.query('GRANT SELECT ON iam.account_security_events TO cpf_app');
    await pool.query('GRANT SELECT, INSERT, UPDATE ON iam.notification_preferences TO cpf_app');
    await pool.query('GRANT SELECT, UPDATE ON iam.onboarding_progress TO cpf_app');
    await pool.query('GRANT SELECT, INSERT ON support.cases TO cpf_app');
    await pool.query('GRANT SELECT, INSERT ON support.case_messages TO cpf_app');
    await pool.query('GRANT SELECT, INSERT ON audit.events TO cpf_app');
  } finally {
    await pool.end();
  }
}
