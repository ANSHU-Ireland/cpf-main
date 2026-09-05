import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import { PgAuditEvidenceRepository } from './pg-extended-repositories.js';

const dbAvailable = isDatabaseConfigured();
const ORG_ID = '11111111-0000-4000-8000-000000000001';
const OTHER_ORG_ID = '11111111-0000-4000-8000-000000000099';
const ACTOR_ID = '11111111-0000-4000-8000-000000000010';
const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/seeds/northstar-demo.sql',
);

describe.skipIf(!dbAvailable)('audit evidence repository against live Postgres', () => {
  let pool: Pool;
  const actor = { userId: ACTOR_ID, tenantId: ORG_ID, roles: ['auditor'] };
  const otherTenantActor = { ...actor, tenantId: OTHER_ORG_ID };

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);
    await pool.query(await readFile(seedPath, 'utf8'));
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('persists a real collection, custody event, traceability link, audit and outbox record', async () => {
    const repository = new PgAuditEvidenceRepository(pool, 'cpf_app');
    const requirementId = randomUUID();
    const requirementKey = `FR-UAT-${Date.now().toString()}`;
    await pool.query(
      `INSERT INTO audit.requirement_traceability
         (id, tenant_id, requirement_key, requirement_title, controls, design_surfaces,
          api_operations, implementation_artifacts, coverage, status, created_by)
       VALUES ($1, $2, $3, 'Verify canonical audit evidence persistence',
               '["CTRL-FR-UAT"]'::jsonb, '["AUD-01","AUD-02"]'::jsonb,
               '["GET /v2/audit/traceability/{requirementId}"]'::jsonb,
               '["Live PostgreSQL integration test"]'::jsonb,
               'full', 'verified', $4)`,
      [requirementId, ORG_ID, requirementKey, ACTOR_ID],
    );

    const created = await repository.createCollection(actor, {
      title: `Live audit evidence ${requirementKey}`,
      purpose: 'Prove canonical, tenant-isolated collection persistence.',
      framework: 'CPF UAT',
      reason: 'Repository integration verification.',
      expectedVersion: 0,
    });
    expect(created).toMatchObject({
      status: 'draft',
      custodian: 'Morgan Lee',
      sealed: false,
      itemCount: 0,
      requirementIds: [],
    });
    expect(created.chainOfCustody).toHaveLength(1);
    expect(created.chainOfCustody[0]).toMatchObject({ action: 'created' });

    const itemId = randomUUID();
    await pool.query(
      `INSERT INTO audit.evidence_collection_items
         (id, tenant_id, collection_id, requirement_traceability_id, evidence_type,
          display_label, reference_uri, sha256, metadata, added_by)
       VALUES ($1, $2, $3, $4, 'automated_test', 'Live integration evidence',
               'cpf://test/audit-evidence', $5, '{"synthetic":true}'::jsonb, $6)`,
      [itemId, ORG_ID, created.id, requirementId, 'a'.repeat(64), ACTOR_ID],
    );

    const listed = await repository.listCollections(actor);
    expect(listed.items.find((item) => item.id === created.id)).toMatchObject({
      itemCount: 1,
      requirementIds: [requirementId],
    });

    const traceability = await repository.getTraceability(actor, requirementId);
    expect(traceability).toMatchObject({
      id: requirementId,
      requirementId: requirementKey,
      controls: ['CTRL-FR-UAT'],
      coverage: 'full',
      status: 'verified',
    });
    expect(traceability?.evidence).toEqual([
      'Live PostgreSQL integration test',
      'Live integration evidence',
    ]);
    expect(await repository.getTraceability(otherTenantActor, requirementId)).toBeNull();

    const sideEffects = await pool.query<{ audits: number; outbox_events: number }>(
      `SELECT
         (SELECT count(*)::int FROM audit.events
           WHERE tenant_id = $1 AND resource_id = $2
             AND action = 'evidence_collection.create') AS audits,
         (SELECT count(*)::int FROM audit.outbox_events
           WHERE tenant_id = $1 AND aggregate_id = $2
             AND event_type = 'audit.evidence_collection.created') AS outbox_events`,
      [ORG_ID, created.id],
    );
    expect(sideEffects.rows[0]).toEqual({ audits: 1, outbox_events: 1 });
  }, 120_000);

  it('returns null instead of fabricating an unlinked requirement', async () => {
    const repository = new PgAuditEvidenceRepository(pool, 'cpf_app');
    expect(await repository.getTraceability(actor, randomUUID())).toBeNull();
  });
});
