import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const OBSERVATION_DISPOSITIONS = ['accepted', 'rejected', 'deferred'] as const;
export type ObservationDisposition = (typeof OBSERVATION_DISPOSITIONS)[number];

export const INTEGRITY_RESOLUTIONS = ['dismissed', 'confirmed', 'escalated'] as const;
export type IntegrityResolution = (typeof INTEGRITY_RESOLUTIONS)[number];

export interface ScorecardAmendmentRecord {
  readonly id: string;
  readonly scorecardId: string;
  readonly rationale: string;
  readonly createdAt: string;
}

export interface ObservationRecord {
  readonly id: string;
  readonly disposition: ObservationDisposition;
  readonly note: string | null;
  readonly updatedAt: string;
}

export interface IntegrityEventRecord {
  readonly id: string;
  readonly resolution: IntegrityResolution;
  readonly note: string | null;
  readonly resolvedAt: string;
}

export interface ScorecardAmendmentCreate {
  readonly rationale: string;
  readonly changes: string;
}

export interface ObservationDispositionInput {
  readonly disposition: ObservationDisposition;
  readonly note?: string;
}

export interface IntegrityResolutionInput {
  readonly resolution: IntegrityResolution;
  readonly note?: string;
}

export interface ReviewQualityRepository {
  createAmendment(
    actor: Actor,
    scorecardId: string,
    input: ScorecardAmendmentCreate,
  ): Promise<ScorecardAmendmentRecord | null>;
  setObservationDisposition(
    actor: Actor,
    observationId: string,
    input: ObservationDispositionInput,
  ): Promise<ObservationRecord | null>;
  resolveIntegrityEvent(
    actor: Actor,
    eventId: string,
    input: IntegrityResolutionInput,
  ): Promise<IntegrityEventRecord | null>;
}

export function parseScorecardAmendmentCreate(
  raw: unknown,
): { ok: true; value: ScorecardAmendmentCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  for (const k of ['rationale', 'changes'] as const) {
    if (typeof obj[k] !== 'string' || (obj[k] as string).length === 0) errors.push(`${k} required`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { rationale: obj.rationale as string, changes: obj.changes as string },
  };
}

export function parseObservationDisposition(
  raw: unknown,
): { ok: true; value: ObservationDispositionInput } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const disposition = obj.disposition;
  if (
    typeof disposition !== 'string' ||
    !OBSERVATION_DISPOSITIONS.includes(disposition as ObservationDisposition)
  ) {
    return { ok: false, errors: ['disposition must be accepted, rejected, or deferred'] };
  }
  const value: ObservationDispositionInput = { disposition: disposition as ObservationDisposition };
  if (typeof obj.note === 'string') return { ok: true, value: { ...value, note: obj.note } };
  return { ok: true, value };
}

export function parseIntegrityResolution(
  raw: unknown,
): { ok: true; value: IntegrityResolutionInput } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const resolution = obj.resolution;
  if (
    typeof resolution !== 'string' ||
    !INTEGRITY_RESOLUTIONS.includes(resolution as IntegrityResolution)
  ) {
    return { ok: false, errors: ['resolution must be dismissed, confirmed, or escalated'] };
  }
  const value: IntegrityResolutionInput = { resolution: resolution as IntegrityResolution };
  if (typeof obj.note === 'string') return { ok: true, value: { ...value, note: obj.note } };
  return { ok: true, value };
}

export function parseReviewQualityId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function createScorecardAmendment(
  deps: { repository: ReviewQualityRepository },
  actor: Actor,
  scorecardId: string,
  input: ScorecardAmendmentCreate,
): Promise<Result<{ amendment: ScorecardAmendmentRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'review_assignment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createAmendment(actor, scorecardId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, amendment: r };
}

export async function setObservationDisposition(
  deps: { repository: ReviewQualityRepository },
  actor: Actor,
  observationId: string,
  input: ObservationDispositionInput,
): Promise<Result<{ observation: ObservationRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'review_assignment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.setObservationDisposition(actor, observationId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, observation: r };
}

export async function resolveIntegrityEvent(
  deps: { repository: ReviewQualityRepository },
  actor: Actor,
  eventId: string,
  input: IntegrityResolutionInput,
): Promise<Result<{ event: IntegrityEventRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'review_assignment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.resolveIntegrityEvent(actor, eventId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, event: r };
}
