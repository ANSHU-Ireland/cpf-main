import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import process from 'node:process';

const { Pool } = pg;
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(packageDir, '../..');
const migrationsPath = path.join(packageDir, 'migrations');
const baselinePath = path.join(
  repoDir,
  'docs/source-of-truth/originals/cpf_postgresql_schema_v2.0.sql',
);
const northstarSeedPath = path.join(packageDir, 'seeds/northstar-demo.sql');
const uatSeedPath = path.join(packageDir, 'seeds/uat-30-tenants.sql');
const credentialsDir = path.resolve(
  process.env.CPF_UAT_CREDENTIALS_DIR ?? path.join(repoDir, 'artifacts/uat-credentials'),
);
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
  throw new Error('DATABASE_URL or the split PostgreSQL settings are required for the UAT seed.');
}
if (process.env.APP_ENV === 'production') {
  throw new Error('The synthetic UAT seed is prohibited when APP_ENV=production.');
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
try {
  const present = await pool.query("SELECT to_regclass('audit.events') IS NOT NULL AS present");
  if (present.rows[0]?.present !== true) {
    await pool.query(await readFile(baselinePath, 'utf8'));
  }
  const migrations = (await readdir(migrationsPath))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();
  for (const filename of migrations) {
    await pool.query(await readFile(path.join(migrationsPath, filename), 'utf8'));
  }
  await pool.query(await readFile(northstarSeedPath, 'utf8'));
  await pool.query(await readFile(uatSeedPath, 'utf8'));

  const summary = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM tenant.organizations
        WHERE settings->>'uatSeed' = 'true') AS tenants,
      (SELECT count(DISTINCT membership.user_id)::int
         FROM iam.memberships AS membership
         JOIN tenant.organizations AS organization ON organization.id = membership.tenant_id
        WHERE organization.settings->>'uatSeed' = 'true') AS tenant_users,
      (SELECT count(DISTINCT password.user_id)::int
         FROM iam.password_credentials AS password
         JOIN iam.memberships AS membership ON membership.user_id = password.user_id
         JOIN tenant.organizations AS organization ON organization.id = membership.tenant_id
        WHERE organization.settings->>'uatSeed' = 'true') AS uat_credentials,
      (SELECT count(DISTINCT password.user_id)::int
         FROM iam.password_credentials AS password
         JOIN iam.memberships AS membership ON membership.user_id = password.user_id
         JOIN tenant.organizations AS organization ON organization.id = membership.tenant_id
        WHERE organization.settings->>'uatSeed' = 'true'
          AND password.reset_required) AS reset_required_credentials,
      (SELECT count(*)::int FROM hiring.campaigns
        WHERE code LIKE 'UAT-%') AS campaigns,
      (SELECT count(*)::int FROM hiring.candidates
        WHERE external_reference LIKE 'UAT-%') AS candidates,
      (SELECT count(*)::int FROM hiring.applications
        WHERE source_reference LIKE 'UAT-%') AS applications
  `);
  const measured = summary.rows[0];
  if (
    Number(measured.tenants) !== 30 ||
    Number(measured.tenant_users) !== 242 ||
    Number(measured.uat_credentials) !== Number(measured.tenant_users) ||
    Number(measured.reset_required_credentials) > Number(measured.tenant_users) ||
    Number(measured.campaigns) !== 120 ||
    Number(measured.applications) !== 360
  ) {
    throw new Error(`UAT seed cardinality check failed: ${JSON.stringify(measured)}`);
  }

  const credentials = await pool.query(`
    SELECT organization.display_name AS tenant,
           app_user.email::text AS email,
           app_user.display_name,
           string_agg(DISTINCT role.code, '|' ORDER BY role.code) AS roles,
           password.reset_required,
           password.password_version
      FROM iam.users AS app_user
      JOIN iam.password_credentials AS password ON password.user_id = app_user.id
      JOIN iam.memberships AS membership ON membership.user_id = app_user.id
      JOIN tenant.organizations AS organization ON organization.id = membership.tenant_id
      JOIN iam.membership_roles AS binding ON binding.membership_id = membership.id
      JOIN iam.roles AS role ON role.id = binding.role_id
     WHERE organization.settings->>'uatSeed' = 'true'
     GROUP BY organization.display_name, app_user.email, app_user.display_name,
              password.reset_required, password.password_version
     ORDER BY organization.display_name, app_user.email
  `);

  const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const sharedPassword = 'CPF-UAT-ChangeMe-2026!';
  const csv = [
    ['tenant', 'email', 'display_name', 'roles', 'temporary_password', 'reset_required'],
    ...credentials.rows.map((row) => [
      row.tenant,
      row.email,
      row.display_name,
      row.roles,
      row.reset_required === true && Number(row.password_version) === 1
        ? sharedPassword
        : row.reset_required === true
          ? '<rotated; use latest rotation manifest>'
          : '<changed by user>',
      row.reset_required,
    ]),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\n');
  await mkdir(credentialsDir, { recursive: true });
  const manifestPath = path.join(credentialsDir, 'cpf-uat-credentials.csv');
  await writeFile(manifestPath, `${csv}\n`, { encoding: 'utf8', mode: 0o600 });

  process.stdout.write(
    `CPF UAT seed complete: ${JSON.stringify(measured)}\n` +
      `Local credential manifest: ${manifestPath}\n` +
      'New accounts use reset-required temporary credentials. Existing password changes are preserved. Never copy this manifest to production.\n',
  );
} finally {
  await pool.end();
}
