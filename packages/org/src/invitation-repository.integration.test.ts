import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import { PgInvitationRepository } from './invitation-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';

const dbAvailable = isDatabaseConfigured();
const ORG_ID = '11111111-0000-4000-8000-000000000001';
const OTHER_ORG_ID = '11111111-0000-4000-8000-000000000002';
const ACTOR_ID = '11111111-0000-4000-8000-000000000010';
const APPLICATION_ID = '11111111-0000-4000-8000-000000000203';
const TOKEN_PREFIX = 'cpf-invitation-repository-test-';

const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/seeds/northstar-demo.sql',
);

describe.skipIf(!dbAvailable)('PgInvitationRepository against live Postgres', () => {
  let pool: Pool;
  const actor = { userId: ACTOR_ID, tenantId: ORG_ID, roles: [EMPLOYER_ADMIN_ROLE] };

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);
    await pool.query(await readFile(seedPath, 'utf8'));
    await pool.query(
      `INSERT INTO tenant.organizations
         (id, slug, legal_name, display_name, status, data_region, default_timezone,
          branding, settings)
       VALUES ($1, 'invitation-repository-other', 'Other Invitation Ltd',
               'Other Invitation', 'active', 'EU', 'Europe/Dublin', '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [OTHER_ORG_ID],
    );
  }, 120_000);

  afterEach(async () => {
    const invitations = await pool.query<{ id: string }>(
      `SELECT id FROM hiring.invitations WHERE token_hash LIKE $1`,
      [`${TOKEN_PREFIX}%`],
    );
    for (const invitation of invitations.rows) {
      await pool.query(`DELETE FROM audit.outbox_events WHERE aggregate_id = $1`, [invitation.id]);
      await pool.query(`DELETE FROM audit.events WHERE resource_id = $1`, [invitation.id]);
    }
    await pool.query(`DELETE FROM hiring.invitations WHERE token_hash LIKE $1`, [
      `${TOKEN_PREFIX}%`,
    ]);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('persists invitation lifecycle changes with audit and outbox evidence', async () => {
    const repository = new PgInvitationRepository(pool, { role: 'cpf_app' });
    const tokenHash = `${TOKEN_PREFIX}${randomUUID()}`;
    const created = await repository.createInvitation(
      actor,
      APPLICATION_ID,
      {
        expiresAt: '2026-09-01T12:00:00.000Z',
        maxAttempts: 2,
      },
      tokenHash,
    );
    expect(created.status).toBe('created');

    const resent = await repository.resendInvitation(actor, created.id);
    expect(resent?.sentAt).not.toBeNull();
    const extended = await repository.extendInvitation(
      actor,
      created.id,
      '2026-09-08T12:00:00.000Z',
    );
    expect(extended?.expiresAt).toBe('2026-09-08T12:00:00.000Z');
    const revoked = await repository.revokeInvitation(actor, created.id);
    expect(revoked?.status).toBe('revoked');

    const evidence = await pool.query<{ audits: number; outbox_events: number }>(
      `SELECT
         (SELECT count(*)::int FROM audit.events
           WHERE tenant_id = $1 AND resource_id = $2) AS audits,
         (SELECT count(*)::int FROM audit.outbox_events
           WHERE tenant_id = $1 AND aggregate_id = $2) AS outbox_events`,
      [ORG_ID, created.id],
    );
    expect(evidence.rows[0]?.audits).toBe(4);
    expect(evidence.rows[0]?.outbox_events).toBe(4);
  });

  it('enforces tenant isolation for invitation reads', async () => {
    const repository = new PgInvitationRepository(pool, { role: 'cpf_app' });
    const created = await repository.createInvitation(
      actor,
      APPLICATION_ID,
      { expiresAt: '2026-09-01T12:00:00.000Z' },
      `${TOKEN_PREFIX}${randomUUID()}`,
    );
    const otherTenant = await repository.getInvitation(
      { userId: ACTOR_ID, tenantId: OTHER_ORG_ID, roles: [EMPLOYER_ADMIN_ROLE] },
      created.id,
    );
    expect(otherTenant).toBeNull();
  });
});
