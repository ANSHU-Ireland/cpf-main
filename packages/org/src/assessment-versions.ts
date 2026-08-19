import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';
import { VALIDATION_TYPES, VALIDATION_STATUSES } from './assessment-version-types.js';
import type {
  AssessmentValidationCreate,
  AssessmentValidationRecord,
  AssessmentVersionRecord,
  ValidationType,
  ValidationStatus,
} from './assessment-version-types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_TYPES: ReadonlySet<string> = new Set(VALIDATION_TYPES);
const VALID_STATUSES: ReadonlySet<string> = new Set(VALIDATION_STATUSES);

export function parseVersionId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export function parseValidationCreate(
  raw: unknown,
): { ok: true; value: AssessmentValidationCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object')
    return { ok: false, errors: ['body must be object'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['validationType'] !== 'string' || !VALID_TYPES.has(obj['validationType'])) {
    errors.push('validationType must be one of: ' + VALIDATION_TYPES.join(', '));
  }
  if (typeof obj['status'] !== 'string' || !VALID_STATUSES.has(obj['status'])) {
    errors.push('status must be one of: ' + VALIDATION_STATUSES.join(', '));
  }
  if (obj['summary'] !== undefined && typeof obj['summary'] !== 'string') {
    errors.push('summary must be string');
  }
  if (obj['evidenceUri'] !== undefined && typeof obj['evidenceUri'] !== 'string') {
    errors.push('evidenceUri must be string');
  }
  if (errors.length > 0) return { ok: false, errors };
  const value: AssessmentValidationCreate = {
    validationType: obj['validationType'] as ValidationType,
    status: obj['status'] as ValidationStatus,
  };
  if (typeof obj['summary'] === 'string') {
    return { ok: true, value: { ...value, summary: obj['summary'] } };
  }
  return { ok: true, value };
}

// --- repositories ---

export interface AssessmentValidationRepository {
  createValidation(
    actor: Actor,
    versionId: string,
    input: AssessmentValidationCreate,
  ): Promise<AssessmentValidationRecord>;
}

export interface AssessmentVersionRepository {
  createVersionForAssessment(
    actor: Actor,
    assessmentId: string,
    rationale: string,
  ): Promise<AssessmentVersionRecord | null>;
  activateVersion(actor: Actor, versionId: string): Promise<AssessmentVersionRecord | null>;
  previewVersion(actor: Actor, versionId: string): Promise<AssessmentVersionPreview | null>;
  duplicateVersion(actor: Actor, versionId: string): Promise<AssessmentVersionRecord | null>;
  suspendVersion(actor: Actor, versionId: string): Promise<AssessmentVersionRecord | null>;
  createDefect(
    actor: Actor,
    versionId: string,
    input: AssessmentDefectCreate,
  ): Promise<AssessmentDefectRecord | null>;
}

export const ASSESSMENT_DEFECT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type AssessmentDefectSeverity = (typeof ASSESSMENT_DEFECT_SEVERITIES)[number];

export interface AssessmentVersionPreview {
  readonly versionId: string;
  readonly itemCount: number;
  readonly durationSeconds: number;
  readonly items: readonly { id: string; prompt: string }[];
}

export interface AssessmentDefectRecord {
  readonly id: string;
  readonly assessmentVersionId: string;
  readonly severity: AssessmentDefectSeverity;
  readonly summary: string;
  readonly createdAt: string;
}

export interface AssessmentDefectCreate {
  readonly severity: AssessmentDefectSeverity;
  readonly summary: string;
}

const VALID_SEVERITIES: ReadonlySet<string> = new Set(ASSESSMENT_DEFECT_SEVERITIES);

export function parseAssessmentDefectCreate(
  raw: unknown,
): { ok: true; value: AssessmentDefectCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['severity'] !== 'string' || !VALID_SEVERITIES.has(obj['severity']))
    errors.push('severity must be low|medium|high|critical');
  if (typeof obj['summary'] !== 'string' || obj['summary'].length === 0)
    errors.push('summary required');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      severity: obj['severity'] as AssessmentDefectSeverity,
      summary: obj['summary'] as string,
    },
  };
}

// --- domain ops ---

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function canWriteAssessment(actor: Actor): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'assessment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  ).allowed;
}

export async function previewAssessmentVersion(
  deps: { repository: AssessmentVersionRepository },
  actor: Actor,
  versionId: string,
): Promise<Result<{ preview: AssessmentVersionPreview }>> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'assessment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.previewVersion(actor, versionId);
  if (record === null) return { ok: false, status: 404, reason: 'Version not found.' };
  return { ok: true, preview: record };
}

export async function createAssessmentDefect(
  deps: { repository: AssessmentVersionRepository },
  actor: Actor,
  versionId: string,
  input: AssessmentDefectCreate,
): Promise<Result<{ defect: AssessmentDefectRecord }>> {
  if (!canWriteAssessment(actor)) return { ok: false, status: 403, reason: 'forbidden' };
  const record = await deps.repository.createDefect(actor, versionId, input);
  if (record === null) return { ok: false, status: 404, reason: 'Version not found.' };
  return { ok: true, defect: record };
}

export async function duplicateAssessmentVersion(
  deps: { repository: AssessmentVersionRepository },
  actor: Actor,
  versionId: string,
): Promise<Result<{ version: AssessmentVersionRecord }>> {
  if (!canWriteAssessment(actor)) return { ok: false, status: 403, reason: 'forbidden' };
  const record = await deps.repository.duplicateVersion(actor, versionId);
  if (record === null) return { ok: false, status: 404, reason: 'Version not found.' };
  return { ok: true, version: record };
}

export async function createAssessmentVersionForAssessment(
  deps: { repository: AssessmentVersionRepository },
  actor: Actor,
  assessmentId: string,
  rationale: string,
): Promise<Result<{ version: AssessmentVersionRecord }>> {
  if (!canWriteAssessment(actor)) return { ok: false, status: 403, reason: 'forbidden' };
  const record = await deps.repository.createVersionForAssessment(actor, assessmentId, rationale);
  if (record === null) {
    return {
      ok: false,
      status: 409,
      reason: 'An existing assessment version is required before a new draft can be created.',
    };
  }
  return { ok: true, version: record };
}

export async function suspendAssessmentVersion(
  deps: { repository: AssessmentVersionRepository },
  actor: Actor,
  versionId: string,
): Promise<Result<{ version: AssessmentVersionRecord }>> {
  if (!canWriteAssessment(actor)) return { ok: false, status: 403, reason: 'forbidden' };
  const record = await deps.repository.suspendVersion(actor, versionId);
  if (record === null) return { ok: false, status: 404, reason: 'Version not found.' };
  return { ok: true, version: record };
}

export async function createAssessmentValidation(
  deps: { repository: AssessmentValidationRepository },
  actor: Actor,
  versionId: string,
  input: AssessmentValidationCreate,
): Promise<Result<{ validation: AssessmentValidationRecord }>> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'assessment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.createValidation(actor, versionId, input);
  return { ok: true, validation: record };
}

export async function activateAssessmentVersion(
  deps: { repository: AssessmentVersionRepository },
  actor: Actor,
  versionId: string,
): Promise<Result<{ version: AssessmentVersionRecord }>> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'assessment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.activateVersion(actor, versionId);
  if (record === null) return { ok: false, status: 404, reason: 'Version not found.' };
  return { ok: true, version: record };
}
