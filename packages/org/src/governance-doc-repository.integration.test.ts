import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import type { GovernanceDocType } from './governance-docs.js';
import { PgGovernanceDocRepository } from './pg-extended-repositories.js';

const dbAvailable = isDatabaseConfigured();
const ORG_ID = '11111111-0000-4000-8000-000000000001';
const OTHER_ORG_ID = '11111111-0000-4000-8000-000000000099';
const ACTOR_ID = '11111111-0000-4000-8000-000000000010';
const SYSTEM_ID = randomUUID();
const CONFORMITY_ID = randomUUID();

const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/seeds/northstar-demo.sql',
);

describe.skipIf(!dbAvailable)('governance document repository against live Postgres', () => {
  let pool: Pool;
  const actor = { userId: ACTOR_ID, tenantId: ORG_ID, roles: ['employer_admin'] };
  const otherTenantActor = { ...actor, tenantId: OTHER_ORG_ID };

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);
    await pool.query(await readFile(seedPath, 'utf8'));
    await pool.query(
      `INSERT INTO governance.ai_system_records
         (id, system_code, name, provider_legal_name, intended_purpose, version,
          lifecycle_status, owner_user_id)
       VALUES ($1, $2, 'Canonical governance documents', 'CPF',
               'Verify canonical document persistence', '1.0', 'validation', $3)`,
      [SYSTEM_ID, `CPF-GOV-DOC-${SYSTEM_ID}`, ACTOR_ID],
    );
    await pool.query(
      `INSERT INTO governance.conformity_assessments
         (id, ai_system_id, release_version, procedure, requirement_results, decision, assessed_by)
       VALUES ($1, $2, '1.0', 'annex_vi_internal_control', '{}'::jsonb, 'conformant', $3)`,
      [CONFORMITY_ID, SYSTEM_ID, ACTOR_ID],
    );
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('persists every mapped family canonically with audit and outbox evidence', async () => {
    const repository = new PgGovernanceDocRepository(pool, 'cpf_app');
    const suffix = Date.now().toString();
    const created = new Map<GovernanceDocType, string>();
    const create = async (docType: GovernanceDocType, data: Record<string, unknown>) => {
      const result = await repository.createDoc(actor, docType, {
        reason: 'Live canonical persistence verification',
        expectedVersion: 0,
        data,
      });
      expect(result).toMatchObject({ ok: true });
      if (!result.ok) throw new Error(result.reason);
      expect(result.doc).toMatchObject({ data });
      created.set(docType, result.doc.id);
      return result.doc;
    };

    await create('ai_literacy', {
      userId: ACTOR_ID,
      roleContext: 'Employer administrator',
      trainingCode: `CPF-AI-LIT-${suffix}`,
      materialVersion: '1.0',
      competenceResult: 'passed',
      completedAt: '2026-08-21T12:00:00.000Z',
      evidenceUri: `s3://cpf-test/ai-literacy-${suffix}.json`,
      approvedBy: ACTOR_ID,
    });
    await create('dataset', {
      datasetCode: `CPF-DATASET-${suffix}`,
      version: '1.0',
      datasetRole: 'validation',
      provenance: { source: 'synthetic UAT generator' },
      lawfulAccess: 'Synthetic non-personal data',
      purpose: 'UAT validation',
      dataSubjects: [],
      representativeness: { reviewed: true },
      qualityChecks: { schema: 'passed' },
      biasAnalysis: { status: 'reviewed' },
      gaps: [],
      licenceTerms: 'CPF internal UAT only',
      storageRegion: 'eu-west-1',
      status: 'approved',
      approvedBy: ACTOR_ID,
    });
    await create('data_use_register', {
      purposeCode: `CPF-PURPOSE-${suffix}`,
      purpose: 'Deliver synthetic UAT assessments',
      dataSubjects: ['synthetic candidates'],
      dataFields: ['synthetic competency answers'],
      source: 'CPF UAT seed',
      cpfRole: 'processor',
      employerRole: 'controller',
      lawfulBasis: 'Synthetic data only',
      recipients: [],
      subprocessors: [],
      storageRegion: 'eu-west-1',
      deletionMethod: 'Cryptographic erasure',
      rights: { access: true, correction: true },
      securityControls: { encryption: true, tenantIsolation: true },
      modelUse: 'No automated hiring decision',
      trainingUse: 'Prohibited',
      humanAccess: 'Least privilege',
      dpiaStatus: 'approved',
      status: 'active',
    });
    await create('impact_assessment', {
      assessmentType: 'dpia',
      scopeType: 'ai_system',
      scopeId: SYSTEM_ID,
      versionNo: 1,
      necessity: 'Validate the UAT processing design before pilot use.',
      risks: [{ code: 'UAT-01', rating: 'low' }],
      measures: [{ code: 'CTRL-01', status: 'effective' }],
      residualRisk: 'low',
      consultationRequired: false,
      status: 'approved',
      approvedBy: ACTOR_ID,
      approvedAt: '2026-08-21T12:00:00.000Z',
    });
    const plan = await create('post_market_plan', {
      aiSystemId: SYSTEM_ID,
      versionNo: 1,
      methodology: { sampling: 'monthly' },
      signalCatalogue: [{ code: 'DRIFT' }],
      thresholds: { warning: 0.1, breach: 0.2 },
      reviewCadence: '30 days',
      status: 'active',
      approvedBy: ACTOR_ID,
      approvedAt: '2026-08-21T12:00:00.000Z',
    });
    await create('post_market_signal', {
      postMarketPlanId: plan.id,
      signalType: 'quality_drift',
      metricWindow: '[2026-08-01T00:00:00Z,2026-08-21T00:00:00Z)',
      value: { delta: 0.02 },
      thresholdStatus: 'normal',
      sourceReference: `UAT-SIGNAL-${suffix}`,
      reviewStatus: 'accepted',
      reviewerUserId: ACTOR_ID,
      reviewedAt: '2026-08-21T12:00:00.000Z',
    });
    const qms = await create('qms_document', {
      documentCode: `CPF-QMS-${suffix}`,
      versionNo: 1,
      documentType: 'quality_procedure',
      title: 'UAT quality procedure',
      contentUri: `s3://cpf-test/qms-${suffix}.pdf`,
      sha256: 'a'.repeat(64),
      status: 'effective',
      approvedBy: ACTOR_ID,
      approvedAt: '2026-08-21T12:00:00.000Z',
    });
    // A sparse seed or old accepted payload must still expose authoritative artifact metadata.
    await pool.query(
      `UPDATE governance.document_payload_evidence SET accepted_payload = $2::jsonb
        WHERE resource_id = $1`,
      [qms.id, JSON.stringify({ contentUri: 'spoofed', ownerUserId: OTHER_ORG_ID })],
    );
    const reloadedQms = await new PgGovernanceDocRepository(pool, 'cpf_app').getDocs(
      actor,
      'qms_document',
      qms.id,
    );
    expect(reloadedQms?.data).toMatchObject({
      contentUri: `s3://cpf-test/qms-${suffix}.pdf`,
      sha256: 'a'.repeat(64),
      ownerUserId: ACTOR_ID,
      approvedBy: ACTOR_ID,
      documentCode: `CPF-QMS-${suffix}`,
    });
    expect(await repository.getDocs(otherTenantActor, 'qms_document', qms.id)).toBeNull();
    await create('technical_document', {
      aiSystemId: SYSTEM_ID,
      versionNo: 1,
      releaseVersion: '1.0',
      annexIvManifest: { sections: ['purpose', 'controls', 'validation'] },
      objectUri: `s3://cpf-test/technical-${suffix}.json`,
      sha256: 'b'.repeat(64),
      status: 'approved',
      approvedBy: ACTOR_ID,
      approvedAt: '2026-08-21T12:00:00.000Z',
    });
    await create('vendor_evidence', {
      vendorCode: `CPF-VENDOR-${suffix}`,
      serviceCode: 'MODEL-GATEWAY',
      evidenceVersion: 1,
      legalEntity: 'Synthetic Vendor Limited',
      aiActRole: 'provider',
      gdprRole: 'processor',
      dataLocations: ['eu-west-1'],
      subprocessors: [],
      trainingUse: 'prohibited',
      retention: '30 days',
      deletion: 'cryptographic erasure',
      securityEvidence: { iso27001: 'synthetic-UAT-evidence' },
      modelDocumentation: { modelCard: true },
      limitations: ['Synthetic test evidence only'],
      changeNotice: '30 days',
      incidentNotice: '24 hours',
      auditRights: 'Annual review',
      exitPlan: 'Export then delete',
      status: 'approved',
      approvedBy: ACTOR_ID,
      approvedAt: '2026-08-21T12:00:00.000Z',
    });
    await create('deployer_instruction', {
      aiSystemId: SYSTEM_ID,
      versionNo: 1,
      releaseVersion: '1.0',
      intendedPurpose: 'Structured competency assessment with human review',
      inputRequirements: { locale: 'en-IE' },
      accuracyMetrics: { validated: true },
      limitations: ['No automated hiring decision'],
      oversightMeasures: { reviewerRequired: true },
      monitoringInstructions: { cadence: 'monthly' },
      incidentInstructions: { channel: 'support' },
      maintenanceInstructions: { releaseWindow: 'controlled' },
      objectUri: `s3://cpf-test/deployer-${suffix}.json`,
      sha256: 'c'.repeat(64),
      status: 'effective',
      approvedBy: ACTOR_ID,
      approvedAt: '2026-08-21T12:00:00.000Z',
    });
    const declaration = await create('eu_declaration', {
      conformityAssessmentId: CONFORMITY_ID,
      declarationNumber: `CPF-EU-DECL-${suffix}`,
      declarationVersion: 1,
      contentUri: `s3://cpf-test/declaration-${suffix}.pdf`,
      sha256: 'd'.repeat(64),
      status: 'signed',
      signedBy: ACTOR_ID,
      signedAt: '2026-08-21T12:00:00.000Z',
    });
    await create('eu_registration', {
      aiSystemId: SYSTEM_ID,
      registrationReference: `CPF-EU-REG-${suffix}`,
      registrationPayload: { registry: 'EU database', environment: 'synthetic UAT' },
      status: 'registered',
      submittedAt: '2026-08-21T12:00:00.000Z',
      confirmedAt: '2026-08-21T12:30:00.000Z',
    });
    await create('ce_marking', {
      aiSystemId: SYSTEM_ID,
      releaseVersion: '1.0',
      declarationId: declaration.id,
      markingLocation: 'CPF release manifest',
      status: 'approved',
      approvedBy: ACTOR_ID,
      approvedAt: '2026-08-21T12:30:00.000Z',
      evidenceUri: `s3://cpf-test/ce-${suffix}.json`,
    });

    expect(created.size).toBe(13);
    const ids = [...created.values()];
    const evidence = await pool.query<{
      payloads: number;
      audits: number;
      outbox_events: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM governance.document_payload_evidence item
           WHERE item.tenant_id = $1 AND item.resource_id = ANY($2::uuid[])) AS payloads,
         (SELECT count(*)::int FROM audit.events event
           WHERE event.tenant_id = $1 AND event.resource_id = ANY($2::uuid[])
             AND event.action LIKE 'governance.%.create') AS audits,
         (SELECT count(*)::int FROM audit.outbox_events event
           WHERE event.tenant_id = $1 AND event.aggregate_id = ANY($2::uuid[])
             AND event.event_type = 'governance.document.created') AS outbox_events`,
      [ORG_ID, ids],
    );
    expect(evidence.rows[0]).toEqual({ payloads: 13, audits: 13, outbox_events: 13 });

    const canonical = await pool.query<Record<string, number>>(
      `SELECT
         (SELECT count(*)::int FROM governance.ai_literacy_records WHERE id = ANY($1::uuid[])) AS ai_literacy,
         (SELECT count(*)::int FROM governance.dataset_registry WHERE id = ANY($1::uuid[])) AS dataset,
         (SELECT count(*)::int FROM governance.data_use_register WHERE id = ANY($1::uuid[])) AS data_use,
         (SELECT count(*)::int FROM governance.impact_assessments WHERE id = ANY($1::uuid[])) AS impact,
         (SELECT count(*)::int FROM governance.post_market_plans WHERE id = ANY($1::uuid[])) AS post_plan,
         (SELECT count(*)::int FROM governance.post_market_signals WHERE id = ANY($1::uuid[])) AS post_signal,
         (SELECT count(*)::int FROM governance.quality_documents WHERE id = ANY($1::uuid[])) AS qms,
         (SELECT count(*)::int FROM governance.technical_document_versions WHERE id = ANY($1::uuid[])) AS technical,
         (SELECT count(*)::int FROM governance.vendor_evidence WHERE id = ANY($1::uuid[])) AS vendor,
         (SELECT count(*)::int FROM governance.deployer_instructions WHERE id = ANY($1::uuid[])) AS deployer,
         (SELECT count(*)::int FROM governance.eu_declarations WHERE id = ANY($1::uuid[])) AS declaration,
         (SELECT count(*)::int FROM governance.eu_registrations WHERE id = ANY($1::uuid[])) AS registration,
         (SELECT count(*)::int FROM governance.ce_marking_records WHERE id = ANY($1::uuid[])) AS ce_marking`,
      [ids],
    );
    expect(Object.values(canonical.rows[0] ?? {}).reduce((sum, count) => sum + count, 0)).toBe(13);

    for (const [docType, id] of created) {
      expect(await repository.getDocs(actor, docType, id)).not.toBeNull();
      expect(await repository.getDocs(otherTenantActor, docType, id)).toBeNull();
    }
  }, 120_000);

  it('fails closed when canonical fields are missing and creates no evidence', async () => {
    const repository = new PgGovernanceDocRepository(pool, 'cpf_app');
    const before = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM governance.document_payload_evidence
        WHERE tenant_id = $1 AND document_type = 'qms_document'`,
      [ORG_ID],
    );
    const result = await repository.createDoc(actor, 'qms_document', {
      data: { title: 'Incomplete and unsafe' },
    });
    expect(result).toEqual({
      ok: false,
      status: 422,
      reason: 'invalid_governance_document',
      errors: ['documentCode is required'],
    });
    const after = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM governance.document_payload_evidence
        WHERE tenant_id = $1 AND document_type = 'qms_document'`,
      [ORG_ID],
    );
    expect(after.rows[0]?.count).toBe(before.rows[0]?.count);
  });
});
