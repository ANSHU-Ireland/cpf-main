import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import { PgCandidateImportRepository } from './candidate-import-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';

const dbAvailable = isDatabaseConfigured();
const ORG_ID = '11111111-0000-4000-8000-00000000f001';
const OTHER_ORG_ID = '11111111-0000-4000-8000-00000000f002';
const ACTOR_ID = '11111111-0000-4000-8000-00000000f010';
const CAMPAIGN_ID = '11111111-0000-4000-8000-00000000f200';
const FILE_PREFIX = 'cpf-import-repository-test-';
const DATA_KEY = 'cpf-import-repository-test-key-2026';

describe.skipIf(!dbAvailable)('PgCandidateImportRepository against live Postgres', () => {
  let pool: Pool;
  const actor = { userId: ACTOR_ID, tenantId: ORG_ID, roles: [EMPLOYER_ADMIN_ROLE] };

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);
    await pool.query(
      `INSERT INTO tenant.organizations
         (id, slug, legal_name, display_name, status, data_region, default_timezone,
          branding, settings)
       VALUES
         ($1, 'candidate-import-test', 'Candidate Import Test Ltd',
          'Candidate Import Test', 'active', 'EU', 'Europe/Dublin', '{}'::jsonb, '{}'::jsonb),
         ($2, 'candidate-import-other', 'Other Import Ltd',
          'Other Import', 'active', 'EU', 'Europe/Dublin', '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (id) DO UPDATE SET updated_at = now()`,
      [ORG_ID, OTHER_ORG_ID],
    );
    await pool.query(
      `INSERT INTO iam.users (id, email, display_name, user_type, status)
       VALUES ($1, 'candidate-import-test@example.test', 'Candidate Import Test Admin',
               'employer_user', 'active')
       ON CONFLICT (id) DO UPDATE SET updated_at = now()`,
      [ACTOR_ID],
    );
    await pool.query(
      `INSERT INTO hiring.campaigns
         (id, tenant_id, owner_user_id, code, title, role_name, seniority, status)
       VALUES ($1, $2, $3, 'IMPORT-REPOSITORY-TEST', 'Import Repository Test',
               'Test Engineer', 'mid', 'draft')
       ON CONFLICT (id) DO UPDATE SET updated_at = now()`,
      [CAMPAIGN_ID, ORG_ID, ACTOR_ID],
    );
  }, 120_000);

  afterEach(async () => {
    const jobs = await pool.query<{ id: string }>(
      `SELECT id
         FROM hiring.candidate_import_jobs
        WHERE source_object_uri LIKE $1`,
      [`candidate-import://${FILE_PREFIX}%`],
    );
    const jobIds = jobs.rows.map((row) => row.id);
    if (jobIds.length === 0) return;
    const rows = await pool.query<{ id: string; candidate_id: string | null }>(
      `SELECT id, candidate_id
         FROM hiring.candidate_import_rows
        WHERE import_job_id = ANY($1::uuid[])`,
      [jobIds],
    );
    const rowIds = rows.rows.map((row) => row.id);
    const candidateIds = rows.rows
      .map((row) => row.candidate_id)
      .filter((id): id is string => id !== null);
    await pool.query(`DELETE FROM audit.outbox_events WHERE aggregate_id = ANY($1::uuid[])`, [
      jobIds,
    ]);
    await pool.query(
      `DELETE FROM audit.events
        WHERE resource_id = ANY($1::uuid[])
           OR resource_id = ANY($2::uuid[])`,
      [jobIds, rowIds],
    );
    await pool.query(`DELETE FROM hiring.candidate_import_jobs WHERE id = ANY($1::uuid[])`, [
      jobIds,
    ]);
    await pool.query(
      `DELETE FROM hiring.applications WHERE source_reference LIKE ANY($1::text[])`,
      [jobIds.map((id) => `candidate-import:${id}:%`)],
    );
    if (candidateIds.length > 0) {
      await pool.query(
        `DELETE FROM hiring.candidates
          WHERE id = ANY($1::uuid[])
            AND external_reference LIKE 'import:%'`,
        [candidateIds],
      );
    }
  });

  afterAll(async () => {
    await pool?.query(`DELETE FROM hiring.campaigns WHERE id = $1`, [CAMPAIGN_ID]);
    await pool?.query(`DELETE FROM iam.users WHERE id = $1`, [ACTOR_ID]);
    await pool?.query(`DELETE FROM tenant.organizations WHERE id IN ($1, $2)`, [
      ORG_ID,
      OTHER_ORG_ID,
    ]);
    await pool?.end();
  });

  it('validates, corrects and commits encrypted rows with audit and outbox evidence', async () => {
    const repository = new PgCandidateImportRepository(pool, {
      role: 'cpf_app',
      dataKey: DATA_KEY,
    });
    const emailNonce = randomUUID().slice(0, 8);
    const input = {
      campaignId: CAMPAIGN_ID,
      idempotencyKey: randomUUID(),
      fileName: `${FILE_PREFIX}${randomUUID()}.csv`,
      rows: [`alex.${emailNonce}@example.test`, 'not-an-email'],
    };
    const created = await repository.createJob(actor, input);
    expect(created.status).toBe('preview_ready');
    expect(created).toMatchObject({ totalRows: 2, validRows: 1, errorRows: 1 });
    expect((await repository.createJob(actor, input)).id).toBe(created.id);

    const preview = await repository.listRows(actor, created.id, 25);
    expect(preview?.items).toHaveLength(2);
    expect(preview?.items[0]?.displayValue).not.toBe(`alex.${emailNonce}@example.test`);
    const invalid = preview?.items.find((row) => row.status === 'invalid');
    expect(invalid).toBeDefined();
    const corrected = await repository.updateRow(actor, created.id, invalid?.id ?? '', {
      action: 'include',
      value: `morgan.${emailNonce}@example.test`,
    });
    expect(corrected?.status).toBe('valid');

    const committed = await repository.commitJob(actor, created.id);
    expect(committed).toMatchObject({ status: 'completed', validRows: 2, errorRows: 0 });
    expect((await repository.commitJob(actor, created.id))?.status).toBe('completed');

    const persisted = await pool.query<{
      applications: number;
      audits: number;
      outbox_events: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM hiring.applications
           WHERE tenant_id = $1 AND source_reference LIKE $2) AS applications,
         (SELECT count(*)::int FROM audit.events
           WHERE tenant_id = $1
             AND (resource_id = $3 OR resource_id = $4)) AS audits,
         (SELECT count(*)::int FROM audit.outbox_events
           WHERE tenant_id = $1 AND aggregate_id = $3) AS outbox_events`,
      [ORG_ID, `candidate-import:${created.id}:%`, created.id, invalid?.id ?? created.id],
    );
    expect(persisted.rows[0]).toEqual({ applications: 2, audits: 3, outbox_events: 3 });
  });

  it('enforces tenant isolation and supports cancellation before commit', async () => {
    const repository = new PgCandidateImportRepository(pool, {
      role: 'cpf_app',
      dataKey: DATA_KEY,
    });
    const created = await repository.createJob(actor, {
      campaignId: CAMPAIGN_ID,
      idempotencyKey: randomUUID(),
      fileName: `${FILE_PREFIX}${randomUUID()}.csv`,
      rows: ['cancel.import@example.test'],
    });
    expect(
      await repository.getJob(
        { userId: ACTOR_ID, tenantId: OTHER_ORG_ID, roles: [EMPLOYER_ADMIN_ROLE] },
        created.id,
      ),
    ).toBeNull();
    expect((await repository.cancelJob(actor, created.id))?.status).toBe('cancelled');
  });
});
