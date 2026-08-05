import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

export interface EvidenceCollectionRecord {
  readonly id: string;
  readonly title: string;
  readonly framework: string;
  readonly status: string;
  readonly itemCount: number;
  readonly createdAt: string;
}

export interface EvidenceCollectionCreate {
  readonly title: string;
  readonly framework: string;
}

export interface TraceabilityRow {
  readonly requirementId: string;
  readonly requirementTitle: string;
  readonly controls: readonly string[];
  readonly evidence: readonly string[];
  readonly coverage: string;
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
  const errors: string[] = [];
  for (const k of ['title', 'framework'] as const) {
    if (typeof obj[k] !== 'string' || (obj[k] as string).length === 0) errors.push(`${k} required`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { title: obj.title as string, framework: obj.framework as string } };
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
