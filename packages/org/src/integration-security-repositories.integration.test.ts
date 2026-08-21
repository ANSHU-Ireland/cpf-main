import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import { AesGcmCandidateImportCodec } from './candidate-import-repository.js';
import { PgIntegrationRepository, PgWebhookRepository } from './pg-extended-repositories.js';

const dbAvailable = isDatabaseConfigured();
const ORG_ID = '11111111-0000-4000-8000-000000000001';
const ACTOR_ID = '11111111-0000-4000-8000-000000000010';
const DATA_KEY = 'cpf-integration-security-repository-test-key-2026';

const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/seeds/northstar-demo.sql',
);

describe.skipIf(!dbAvailable)('integration secret repositories against live Postgres', () => {
  let pool: Pool;
  const actor = { userId: ACTOR_ID, tenantId: ORG_ID, roles: ['employer_admin'] };

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);
    await pool.query(await readFile(seedPath, 'utf8'));
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('rotates encrypted integration credentials and emits durable evidence', async () => {
    const repository = new PgIntegrationRepository(pool, 'cpf_app', DATA_KEY);
    const created = await repository.createIntegration(actor, {
      connectionType: 'webhook',
      provider: `CPF integration test ${Date.now()}`,
      config: { region: 'eu-west-1' },
    });
    const rotated = await new PgIntegrationRepository(pool, 'cpf_app', DATA_KEY).rotateIntegration(
      actor,
      created.id,
    );
    expect(rotated?.updatedAt).not.toBe(created.updatedAt);

    const evidence = await pool.query<{
      encrypted_credentials: Buffer;
      credentials_rotated_at: Date;
      audits: number;
      outbox_events: number;
    }>(
      `SELECT connection.encrypted_credentials, connection.credentials_rotated_at,
              (SELECT count(*)::int FROM audit.events event
                WHERE event.tenant_id = connection.tenant_id
                  AND event.resource_id = connection.id
                  AND event.action = 'integration.rotate') AS audits,
              (SELECT count(*)::int FROM audit.outbox_events event
                WHERE event.tenant_id = connection.tenant_id
                  AND event.aggregate_id = connection.id
                  AND event.event_type = 'integration.credentials.rotated') AS outbox_events
         FROM integration.connections connection
        WHERE connection.id = $1`,
      [created.id],
    );
    const plaintext = new AesGcmCandidateImportCodec(DATA_KEY).decode(
      evidence.rows[0]?.encrypted_credentials ?? Buffer.alloc(0),
    );
    expect(plaintext.length).toBeGreaterThan(32);
    expect(evidence.rows[0]?.credentials_rotated_at).toBeInstanceOf(Date);
    expect(evidence.rows[0]).toMatchObject({ audits: 1, outbox_events: 1 });
  });

  it('stores webhook signing material encrypted and maps disabled to canonical revoked state', async () => {
    const repository = new PgWebhookRepository(pool, 'cpf_app', DATA_KEY);
    const targetUrl = `https://hooks-${Date.now()}.cpf.invalid/events`;
    const created = await repository.createWebhook(actor, {
      targetUrl,
      eventTypes: ['assessment.submitted', 'review.completed'],
    });
    expect(created).toMatchObject({ targetUrl, status: 'active' });

    const stored = await pool.query<{
      endpoint_url: string;
      event_types: string[];
      signing_secret_encrypted: Buffer;
    }>(
      `SELECT endpoint_url, event_types, signing_secret_encrypted
         FROM integration.webhook_subscriptions
        WHERE id = $1`,
      [created.id],
    );
    expect(stored.rows[0]).toMatchObject({
      endpoint_url: targetUrl,
      event_types: ['assessment.submitted', 'review.completed'],
    });
    expect(
      new AesGcmCandidateImportCodec(DATA_KEY).decode(
        stored.rows[0]?.signing_secret_encrypted ?? Buffer.alloc(0),
      ).length,
    ).toBeGreaterThan(32);

    const disabled = await new PgWebhookRepository(pool, 'cpf_app', DATA_KEY).updateWebhookStatus(
      actor,
      created.id,
      { status: 'disabled' },
    );
    expect(disabled?.status).toBe('disabled');
    const canonical = await pool.query<{ status: string }>(
      'SELECT status FROM integration.webhook_subscriptions WHERE id = $1',
      [created.id],
    );
    expect(canonical.rows[0]?.status).toBe('revoked');
  });
});
