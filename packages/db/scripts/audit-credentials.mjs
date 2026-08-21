import pg from 'pg';
import { readFileSync } from 'node:fs';
import process from 'node:process';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const splitConnection = {
  host: process.env.MASTER_DB_HOST ?? process.env.PGHOST,
  port: Number(process.env.MASTER_DB_PORT ?? process.env.PGPORT ?? 5432),
  database: process.env.MASTER_DB_NAME ?? process.env.PGDATABASE,
  user: process.env.MASTER_DB_USER ?? process.env.PGUSER,
  password: process.env.MASTER_DB_PASSWORD ?? process.env.PGPASSWORD,
};
const splitConfigured = Boolean(
  splitConnection.host &&
  splitConnection.database &&
  splitConnection.user &&
  splitConnection.password,
);
if ((connectionString === undefined || connectionString.length === 0) && !splitConfigured) {
  throw new Error('DATABASE_URL or the split PostgreSQL settings are required for this gate.');
}

const liveGate = process.argv.includes('--live-gate');
const sslRootCert = process.env.PGSSLROOTCERT?.trim();
const pool = new Pool({
  ...(connectionString === undefined || connectionString.length === 0
    ? splitConnection
    : { connectionString }),
  ...(process.env.PGSSL === 'true'
    ? {
        ssl: {
          rejectUnauthorized: true,
          ...(sslRootCert ? { ca: readFileSync(sslRootCert, 'utf8') } : {}),
        },
      }
    : {}),
});
try {
  const result = await pool.query(`
    SELECT
      count(*) FILTER (WHERE password.reset_required)::int AS reset_required,
      count(*) FILTER (WHERE app_user.email::text LIKE '%.invalid')::int AS synthetic_emails,
      count(*) FILTER (WHERE organization.settings->>'uatSeed' = 'true')::int AS uat_memberships,
      count(*)::int AS credential_count
      FROM iam.password_credentials AS password
      JOIN iam.users AS app_user ON app_user.id = password.user_id
      LEFT JOIN iam.memberships AS membership ON membership.user_id = app_user.id
      LEFT JOIN tenant.organizations AS organization ON organization.id = membership.tenant_id
  `);
  const audit = result.rows[0];
  process.stdout.write(`Credential audit: ${JSON.stringify(audit)}\n`);
  if (
    liveGate &&
    (Number(audit.reset_required) > 0 ||
      Number(audit.synthetic_emails) > 0 ||
      Number(audit.uat_memberships) > 0)
  ) {
    throw new Error(
      'LIVE GATE FAILED: temporary credentials or synthetic UAT identities remain in this database.',
    );
  }
  if (liveGate)
    process.stdout.write('LIVE GATE PASSED: no UAT credentials or identities remain.\n');
} finally {
  await pool.end();
}
