import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import { PgAdminPrivilegedAccessRepository } from './pg-extended-repositories.js';

const dbAvailable = isDatabaseConfigured();
const ORG_ID = '11111111-0000-4000-8000-000000000001';
const ACTOR_ID = '11111111-0000-4000-8000-000000000010';

const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/seeds/northstar-demo.sql',
);

describe.skipIf(!dbAvailable)('privileged access repository against live Postgres', () => {
  let pool: Pool;
  const actor = { userId: ACTOR_ID, tenantId: ORG_ID, roles: ['platform_staff'] };

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);
    await pool.query(await readFile(seedPath, 'utf8'));
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('persists, audits and revokes a justified time-bound grant', async () => {
    const repository = new PgAdminPrivilegedAccessRepository(pool, 'cpf_app');
    const expiresAt = '2030-01-01T00:00:00.000Z';
    const created = await repository.createGrant(actor, {
      userId: ACTOR_ID,
      scope: 'database:read',
      reason: 'Investigate support case SUP-2026-001 without impersonation.',
      expiresAt,
    });
    expect(created).toMatchObject({
      userId: ACTOR_ID,
      scope: 'database:read',
      reason: 'Investigate support case SUP-2026-001 without impersonation.',
      expiresAt,
    });

    const evidence = await pool.query<{
      tenant_id: string;
      purpose: string;
      case_reference: string;
      audits: number;
      outbox_events: number;
    }>(
      `SELECT grant_record.tenant_id, grant_record.purpose, grant_record.case_reference,
              (SELECT count(*)::int FROM audit.events event
                WHERE event.tenant_id = grant_record.tenant_id
                  AND event.resource_id = grant_record.id
                  AND event.action = 'privileged_access.grant') AS audits,
              (SELECT count(*)::int FROM audit.outbox_events event
                WHERE event.tenant_id = grant_record.tenant_id
                  AND event.aggregate_id = grant_record.id
                  AND event.event_type = 'privileged_access.granted') AS outbox_events
         FROM iam.privileged_access_grants grant_record
        WHERE grant_record.id = $1`,
      [created.id],
    );
    expect(evidence.rows[0]).toMatchObject({
      tenant_id: ORG_ID,
      purpose: 'support',
      audits: 1,
      outbox_events: 1,
    });
    expect(evidence.rows[0]?.case_reference).toMatch(/^PAM-[0-9A-F-]+$/);

    expect(
      await new PgAdminPrivilegedAccessRepository(pool, 'cpf_app').revokeGrant(actor, created.id),
    ).toBe(true);
    expect(await repository.revokeGrant(actor, created.id)).toBe(false);
  });
});
