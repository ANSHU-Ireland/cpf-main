import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface GovernanceDocRecord {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GovernanceDocCreate {
  readonly title: string;
  readonly description: string;
}

export type GovernanceDocType =
  | 'ai_literacy'
  | 'dataset'
  | 'data_use_register'
  | 'impact_assessment'
  | 'post_market_plan'
  | 'post_market_signal'
  | 'qms_document'
  | 'technical_document'
  | 'vendor_evidence'
  | 'deployer_instruction';

export interface GovernanceDocRepository {
  listDocs(
    actor: Actor,
    docType: GovernanceDocType,
  ): Promise<{ items: readonly GovernanceDocRecord[]; total: number }>;
  getDocs(
    actor: Actor,
    docType: GovernanceDocType,
    id: string,
  ): Promise<GovernanceDocRecord | null>;
  createDoc(
    actor: Actor,
    docType: GovernanceDocType,
    input: GovernanceDocCreate,
  ): Promise<GovernanceDocRecord>;
}

export function parseGovernanceDocCreate(
  raw: unknown,
): { ok: true; value: GovernanceDocCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['title'] !== 'string' || obj['title'].length === 0) errors.push('title required');
  if (typeof obj['description'] !== 'string' || obj['description'].length === 0)
    errors.push('description required');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { title: obj['title'] as string, description: obj['description'] as string },
  };
}

export function parseGovernanceDocId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listGovernanceDocs(
  deps: { repository: GovernanceDocRepository },
  actor: Actor,
  docType: GovernanceDocType,
): Promise<Result<{ items: readonly GovernanceDocRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'governance_doc', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  return { ok: true, ...(await deps.repository.listDocs(actor, docType)) };
}

export async function getGovernanceDoc(
  deps: { repository: GovernanceDocRepository },
  actor: Actor,
  docType: GovernanceDocType,
  id: string,
): Promise<Result<{ doc: GovernanceDocRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'governance_doc', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.getDocs(actor, docType, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, doc: r };
}

export async function createGovernanceDoc(
  deps: { repository: GovernanceDocRepository },
  actor: Actor,
  docType: GovernanceDocType,
  input: GovernanceDocCreate,
): Promise<Result<{ doc: GovernanceDocRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'governance_doc', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createDoc(actor, docType, input);
  return { ok: true, doc: r };
}
