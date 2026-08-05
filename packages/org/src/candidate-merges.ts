import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MergeRecord {
  readonly id: string;
  readonly primaryCandidateId: string;
  readonly duplicateCandidateId: string;
  readonly status: string;
  readonly mergedAt: string;
}

export interface MergePreview {
  readonly primaryCandidateId: string;
  readonly duplicateCandidateId: string;
  readonly conflicts: readonly string[];
  readonly fieldsMerged: number;
}

export interface CandidateMergeInput {
  readonly primaryCandidateId: string;
  readonly duplicateCandidateId: string;
}

export interface CandidateMergeRepository {
  previewMerge(actor: Actor, input: CandidateMergeInput): Promise<MergePreview | null>;
  mergeCandidates(actor: Actor, input: CandidateMergeInput): Promise<MergeRecord | null>;
  reverseMerge(actor: Actor, mergeId: string): Promise<MergeRecord | null>;
}

export function parseCandidateMergeInput(
  raw: unknown,
): { ok: true; value: CandidateMergeInput } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  for (const k of ['primaryCandidateId', 'duplicateCandidateId'] as const) {
    if (typeof obj[k] !== 'string' || !UUID_RE.test(obj[k] as string))
      errors.push(`${k} must be a uuid`);
  }
  if (errors.length === 0 && obj.primaryCandidateId === obj.duplicateCandidateId) {
    errors.push('primary and duplicate must differ');
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      primaryCandidateId: obj.primaryCandidateId as string,
      duplicateCandidateId: obj.duplicateCandidateId as string,
    },
  };
}

export function parseMergeId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function previewCandidateMerge(
  deps: { repository: CandidateMergeRepository },
  actor: Actor,
  input: CandidateMergeInput,
): Promise<Result<{ preview: MergePreview }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'candidate', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.previewMerge(actor, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, preview: r };
}

export async function mergeCandidates(
  deps: { repository: CandidateMergeRepository },
  actor: Actor,
  input: CandidateMergeInput,
): Promise<Result<{ merge: MergeRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'candidate', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.mergeCandidates(actor, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, merge: r };
}

export async function reverseCandidateMerge(
  deps: { repository: CandidateMergeRepository },
  actor: Actor,
  mergeId: string,
): Promise<Result<{ merge: MergeRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'candidate', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.reverseMerge(actor, mergeId);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, merge: r };
}
