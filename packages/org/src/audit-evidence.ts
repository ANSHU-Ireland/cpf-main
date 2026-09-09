import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

export interface EvidenceCollectionRecord {
  readonly id: string;
  readonly title: string;
  readonly purpose: string;
  readonly framework: string;
  readonly status: string;
  readonly custodian: string;
  readonly sealed: boolean;
  readonly itemCount: number;
  readonly requirementIds: readonly string[];
  readonly chainOfCustody: readonly EvidenceCustodyEvent[];
  readonly createdAt: string;
}

export interface EvidenceCustodyEvent {
  readonly actor: string;
  readonly action: string;
  readonly timestamp: string;
}

export interface EvidenceCollectionCreate {
  readonly title: string;
  readonly purpose: string;
  readonly framework: string;
  readonly reason: string | null;
  readonly expectedVersion: number | null;
}

export interface TraceabilityRow {
  readonly id: string;
  readonly requirementId: string;
  readonly requirementTitle: string;
  readonly controls: readonly string[];
  readonly surfaces: readonly string[];
  readonly endpoints: readonly string[];
  readonly evidence: readonly string[];
  readonly coverage: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface AuditEvidenceRepository {
  listCollections(
    actor: Actor,
  ): Promise<{ items: readonly EvidenceCollectionRecord[]; total: number }>;
  createCollection(
    actor: Actor,
    input: EvidenceCollectionCreate,
  ): Promise<EvidenceCollectionRecord>;
  getTraceability(actor: Actor, requirementId: string): Promise<TraceabilityRow | null>;
}

export function parseEvidenceCollectionCreate(
  raw: unknown,
): { ok: true; value: EvidenceCollectionCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const data =
    obj.data !== null && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : obj;
  const errors: string[] = [];
  for (const k of ['title', 'purpose'] as const) {
    if (typeof data[k] !== 'string' || (data[k] as string).trim().length < 4)
      errors.push(`${k} must contain at least 4 characters`);
  }
  if (typeof data.title === 'string' && data.title.trim().length > 200)
    errors.push('title must contain no more than 200 characters');
  if (typeof data.purpose === 'string' && data.purpose.trim().length > 2000)
    errors.push('purpose must contain no more than 2000 characters');
  if (data.framework !== undefined && typeof data.framework !== 'string')
    errors.push('framework must be a string');
  if (typeof data.framework === 'string' && data.framework.trim().length > 200)
    errors.push('framework must contain no more than 200 characters');
  if (typeof data.framework === 'string' && data.framework.trim().length === 1)
    errors.push('framework must contain at least 2 characters');
  if (obj.reason !== undefined && typeof obj.reason !== 'string')
    errors.push('reason must be a string');
  if (typeof obj.reason === 'string' && obj.reason.length > 2000)
    errors.push('reason must contain no more than 2000 characters');
  if (
    obj.expectedVersion !== undefined &&
    (!Number.isInteger(obj.expectedVersion) || obj.expectedVersion !== 0)
  )
    errors.push('expectedVersion must be 0 when creating a collection');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title: (data.title as string).trim(),
      purpose: (data.purpose as string).trim(),
      framework:
        typeof data.framework === 'string' && data.framework.trim() !== ''
          ? data.framework.trim()
          : 'EU AI Act',
      reason: typeof obj.reason === 'string' && obj.reason.trim() !== '' ? obj.reason.trim() : null,
      expectedVersion: obj.expectedVersion === 0 ? 0 : null,
    },
  };
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listEvidenceCollections(
  deps: { repository: AuditEvidenceRepository },
  actor: Actor,
): Promise<Result<{ items: readonly EvidenceCollectionRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'audit_evidence', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.listCollections(actor);
  return { ok: true, items: r.items, total: r.total };
}

export async function createEvidenceCollection(
  deps: { repository: AuditEvidenceRepository },
  actor: Actor,
  input: EvidenceCollectionCreate,
): Promise<Result<{ collection: EvidenceCollectionRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'audit_evidence', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createCollection(actor, input);
  return { ok: true, collection: r };
}

export async function getTraceability(
  deps: { repository: AuditEvidenceRepository },
  actor: Actor,
  requirementId: string,
): Promise<Result<{ row: TraceabilityRow }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'audit_evidence', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.getTraceability(actor, requirementId);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, row: r };
}
