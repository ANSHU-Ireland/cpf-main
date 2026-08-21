import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import {
  PgAdminAuditRepository,
  PgAdminMaintenanceRepository,
} from './pg-extended-repositories.js';

const dbAvailable = isDatabaseConfigured();
const ORG_ID = '11111111-0000-4000-8000-000000000001';
const ACTOR_ID = '11111111-0000-4000-8000-000000000010';

const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/seeds/northstar-demo.sql',
);

describe.skipIf(!dbAvailable)('admin operations repositories against live Postgres', () => {
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

  it('persists a scoped audit export job with atomic audit and outbox evidence', async () => {
    const from = '2026-01-01T00:00:00.000Z';
    const to = '2026-02-01T00:00:00.000Z';
    const created = await new PgAdminAuditRepository(pool, 'cpf_app').createExport(actor, {
      from,
      to,
      format: 'json',
    });

    expect(created.status).toBe('pending');
    expect(created.format).toBe('json');

    const evidence = await pool.query<{
      tenant_id: string;
      requested_by: string;
      from_at: Date;
      to_at: Date;
      audits: number;
      outbox_events: number;
    }>(
      `SELECT export.tenant_id, export.requested_by, export.from_at, export.to_at,
              (SELECT count(*)::int FROM audit.events event
                WHERE event.tenant_id = export.tenant_id
                  AND event.resource_id = export.id
                  AND event.action = 'audit_export.create') AS audits,
              (SELECT count(*)::int FROM audit.outbox_events event
                WHERE event.tenant_id = export.tenant_id
                  AND event.aggregate_id = export.id
                  AND event.event_type = 'audit.export.requested') AS outbox_events
         FROM audit.export_jobs export
        WHERE export.id = $1`,
      [created.id],
    );
    expect(evidence.rows[0]).toMatchObject({
      tenant_id: ORG_ID,
      requested_by: ACTOR_ID,
      audits: 1,
      outbox_events: 1,
    });
    expect(evidence.rows[0]?.from_at.toISOString()).toBe(from);
    expect(evidence.rows[0]?.to_at.toISOString()).toBe(to);
  });

  it('persists a maintenance window and reloads it through a new repository instance', async () => {
    const description = `CPF integration maintenance ${Date.now()}`;
    const startsAt = '2030-01-01T01:00:00.000Z';
    const endsAt = '2030-01-01T02:00:00.000Z';
    const created = await new PgAdminMaintenanceRepository(pool, 'cpf_app').createWindow(actor, {
      startsAt,
      endsAt,
      description,
    });

    expect(created).toMatchObject({ startsAt, endsAt, description, status: 'scheduled' });
    const page = await new PgAdminMaintenanceRepository(pool, 'cpf_app').listWindows(actor);
    expect(page.items.find((window) => window.id === created.id)).toEqual(created);

    const evidence = await pool.query<{ audits: number; outbox_events: number }>(
      `SELECT
         (SELECT count(*)::int FROM audit.events event
           WHERE event.tenant_id = $1 AND event.resource_id = $2
             AND event.action = 'maintenance_window.create') AS audits,
         (SELECT count(*)::int FROM audit.outbox_events event
           WHERE event.tenant_id = $1 AND event.aggregate_id = $2
             AND event.event_type = 'maintenance_window.scheduled') AS outbox_events`,
      [ORG_ID, created.id],
    );
    expect(evidence.rows[0]).toEqual({ audits: 1, outbox_events: 1 });
  });
});
