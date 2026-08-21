import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import { PgGovernanceSubmissionRepository } from './pg-extended-repositories.js';

const dbAvailable = isDatabaseConfigured();
const ORG_ID = '11111111-0000-4000-8000-000000000001';
const ACTOR_ID = '11111111-0000-4000-8000-000000000010';
const SYSTEM_ID = '11111111-0000-4000-8000-000000000700';
const INSTRUCTION_ID = '11111111-0000-4000-8000-000000000701';
const ASSESSMENT_ID = '11111111-0000-4000-8000-000000000702';
const INCIDENT_ID = '11111111-0000-4000-8000-000000000703';
const CHANGE_ID = '11111111-0000-4000-8000-000000000704';

const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/seeds/northstar-demo.sql',
);

describe.skipIf(!dbAvailable)('governance submission repository against live Postgres', () => {
  let pool: Pool;
  const actor = { userId: ACTOR_ID, tenantId: ORG_ID, roles: ['employer_admin'] };

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);
    await pool.query(await readFile(seedPath, 'utf8'));
    await pool.query(
      `INSERT INTO governance.ai_system_records
         (id, system_code, name, provider_legal_name, intended_purpose, version,
          lifecycle_status, owner_user_id)
       VALUES ($1, 'CPF-GOV-REPOSITORY-TEST', 'Governance repository test', 'CPF',
               'Verify durable governance workflows', '1.0', 'validation', $2)
       ON CONFLICT (id) DO NOTHING`,
      [SYSTEM_ID, ACTOR_ID],
    );
    await pool.query(
      `INSERT INTO governance.deployer_instructions
         (id, ai_system_id, version_no, release_version, intended_purpose, input_requirements,
          accuracy_metrics, limitations, oversight_measures, monitoring_instructions,
          incident_instructions, maintenance_instructions, object_uri, sha256, status,
          approved_by, approved_at)
       VALUES ($1, $2, 1, '1.0', 'Controlled competency assessment', '{}'::jsonb,
               '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
               '{}'::jsonb, 's3://cpf-test/deployer-instructions.json', repeat('a', 64),
               'effective', $3, now())
       ON CONFLICT (id) DO NOTHING`,
      [INSTRUCTION_ID, SYSTEM_ID, ACTOR_ID],
    );
    await pool.query(
      `INSERT INTO governance.conformity_assessments
         (id, ai_system_id, release_version, procedure, requirement_results, decision, assessed_by)
       VALUES ($1, $2, '1.0', 'annex_vi_internal_control', '{}'::jsonb, 'conformant', $3)
       ON CONFLICT (id) DO UPDATE SET decision = 'conformant', approved_by = NULL, approved_at = NULL`,
      [ASSESSMENT_ID, SYSTEM_ID, ACTOR_ID],
    );
    await pool.query(
      `INSERT INTO governance.serious_incident_reports
         (id, tenant_id, ai_system_id, assessment, serious_incident, affected_people,
          status, owner_user_id)
       VALUES ($1, $2, $3, 'Initial assessment', true, '[]'::jsonb, 'assessing', $4)
       ON CONFLICT (id) DO UPDATE
         SET status = 'assessing', notes = NULL, updated_at = now(), closed_at = NULL`,
      [INCIDENT_ID, ORG_ID, SYSTEM_ID, ACTOR_ID],
    );
    await pool.query(
      `INSERT INTO governance.change_requests
         (id, tenant_id, change_code, change_type, scope, description, intended_purpose_impact,
          data_impact, rights_impact, substantial_modification_risk, required_reviews,
          required_revalidation, rollback_plan, status, requested_by)
       VALUES ($1, $2, 'CPF-CHANGE-REPOSITORY-TEST', 'model', '{}'::jsonb, 'Test change',
               'none', 'none', 'none', 'low', '[]'::jsonb, '[]'::jsonb,
               'Restore prior release', 'review', $3)
       ON CONFLICT (id) DO UPDATE
         SET status = 'review', decision_reason = NULL, decided_by = NULL, decided_at = NULL,
             approved_by = NULL, approved_at = NULL, updated_at = now()`,
      [CHANGE_ID, ORG_ID, ACTOR_ID],
    );
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('persists a submission command with audit and outbox evidence', async () => {
    const reference = `EU-REG-${Date.now()}`;
    const created = await new PgGovernanceSubmissionRepository(pool, 'cpf_app').createSubmission(
      actor,
      'eu_registration',
      { reference, summary: 'Registration package supplied to the competent authority.' },
    );

    expect(created).toMatchObject({
      submissionType: 'eu_registration',
      reference,
      status: 'submitted',
    });
    const evidence = await pool.query<{
      submissions: number;
      audits: number;
      outbox_events: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM governance.submissions submission
           WHERE submission.tenant_id = $1 AND submission.id = $2) AS submissions,
         (SELECT count(*)::int FROM audit.events event
           WHERE event.tenant_id = $1 AND event.resource_id = $2
             AND event.action = 'governance.eu_registration.submit') AS audits,
         (SELECT count(*)::int FROM audit.outbox_events event
           WHERE event.tenant_id = $1 AND event.aggregate_id = $2
             AND event.event_type = 'governance.submission.created') AS outbox_events`,
      [ORG_ID, created.id],
    );
    expect(evidence.rows[0]).toEqual({ submissions: 1, audits: 1, outbox_events: 1 });
  });

  it('reads structured effective deployer instructions without invented content', async () => {
    const instruction = await new PgGovernanceSubmissionRepository(
      pool,
      'cpf_app',
    ).getDeployerInstruction(actor, SYSTEM_ID);
    expect(instruction?.id).toBe(INSTRUCTION_ID);
    expect(JSON.parse(instruction?.content ?? '{}')).toMatchObject({
      intendedPurpose: 'Controlled competency assessment',
      objectUri: 's3://cpf-test/deployer-instructions.json',
      sha256: 'a'.repeat(64),
    });
  });

  it('updates canonical governance records and returns null for missing targets', async () => {
    const repository = new PgGovernanceSubmissionRepository(pool, 'cpf_app');

    const approved = await repository.approveConformityAssessment(actor, ASSESSMENT_ID);
    expect(approved).toMatchObject({
      id: ASSESSMENT_ID,
      reference: '1.0',
      status: 'approved',
    });
    expect(
      await repository.approveConformityAssessment(actor, '11111111-0000-4000-8000-000000000799'),
    ).toBeNull();

    const incident = await repository.updateSeriousIncident(actor, INCIDENT_ID, {
      status: 'follow_up',
      notes: 'Authority notification receipt is attached.',
    });
    expect(incident).toMatchObject({ id: INCIDENT_ID, status: 'follow_up' });

    const decision = await repository.decideChangeRequest(actor, CHANGE_ID, {
      decision: 'approved',
      rationale: 'Independent validation and rollback evidence are complete.',
    });
    expect(decision).toMatchObject({
      id: CHANGE_ID,
      reference: 'CPF-CHANGE-REPOSITORY-TEST',
      status: 'approved',
    });

    const stored = await pool.query<{
      incident_notes: string;
      decision_reason: string;
      decided_by: string;
    }>(
      `SELECT
         (SELECT notes FROM governance.serious_incident_reports WHERE id = $1) AS incident_notes,
         (SELECT decision_reason FROM governance.change_requests WHERE id = $2) AS decision_reason,
         (SELECT decided_by FROM governance.change_requests WHERE id = $2) AS decided_by`,
      [INCIDENT_ID, CHANGE_ID],
    );
    expect(stored.rows[0]).toEqual({
      incident_notes: 'Authority notification receipt is attached.',
      decision_reason: 'Independent validation and rollback evidence are complete.',
      decided_by: ACTOR_ID,
    });
  });
});
