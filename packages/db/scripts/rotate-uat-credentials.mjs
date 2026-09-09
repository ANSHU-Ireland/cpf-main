import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import pg from 'pg';
import process from 'node:process';

const { Pool } = pg;
if (!process.argv.includes('--confirm-uat-rotation')) {
  throw new Error('Pass --confirm-uat-rotation to rotate every synthetic UAT password.');
}
if (process.env.APP_ENV === 'production') {
  throw new Error('Bulk UAT credential rotation is prohibited in production.');
}

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
  throw new Error('Database settings are required for UAT credential rotation.');
}

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

const credentialsDir = path.resolve(
  process.env.CPF_UAT_CREDENTIALS_DIR ?? 'artifacts/uat-credentials',
);
const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const temporaryPassword = () => `Cpf-UAT-${randomBytes(18).toString('base64url')}!`;

const client = await pool.connect();
try {
  await client.query('BEGIN');
  const users = await client.query(`
    SELECT app_user.id, app_user.email::text AS email, app_user.display_name,
           organization.display_name AS tenant,
           string_agg(DISTINCT role.code, '|' ORDER BY role.code) AS roles
      FROM iam.users AS app_user
      JOIN iam.memberships AS membership ON membership.user_id = app_user.id
      JOIN tenant.organizations AS organization ON organization.id = membership.tenant_id
      JOIN iam.membership_roles AS binding ON binding.membership_id = membership.id
      JOIN iam.roles AS role ON role.id = binding.role_id
     WHERE organization.settings->>'uatSeed' = 'true'
     GROUP BY app_user.id, app_user.email, app_user.display_name, organization.display_name
     ORDER BY organization.display_name, app_user.email
  `);
  const manifestRows = [];
  for (const user of users.rows) {
    const password = temporaryPassword();
    await client.query(
      `UPDATE iam.password_credentials
          SET password_hash = crypt($2, gen_salt('bf', 10)),
              reset_required = true,
              password_version = password_version + 1,
              last_rotated_at = now(),
              expires_at = now() + interval '14 days',
              updated_at = now()
        WHERE user_id = $1`,
      [user.id, password],
    );
    await client.query(
      `UPDATE iam.user_sessions
          SET revoked_at = now(), revocation_reason = 'uat_bulk_rotation'
        WHERE user_id = $1 AND revoked_at IS NULL`,
      [user.id],
    );
    manifestRows.push([user.tenant, user.email, user.display_name, user.roles, password, true]);
  }
  await client.query('COMMIT');

  const csv = [
    ['tenant', 'email', 'display_name', 'roles', 'temporary_password', 'reset_required'],
    ...manifestRows,
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\n');
  await mkdir(credentialsDir, { recursive: true });
  const manifestPath = path.join(credentialsDir, `cpf-uat-credentials-rotated-${Date.now()}.csv`);
  await writeFile(manifestPath, `${csv}\n`, { encoding: 'utf8', mode: 0o600 });
  process.stdout.write(
    `Rotated ${users.rowCount ?? users.rows.length} UAT credentials and revoked their sessions.\n` +
      `Local credential manifest: ${manifestPath}\n`,
  );
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
