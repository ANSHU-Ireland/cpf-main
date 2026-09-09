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
  readonly data: Readonly<Record<string, unknown>>;
}

export interface GovernanceDocCreate {
  readonly reason?: string;
  readonly expectedVersion?: number;
  readonly data: Readonly<Record<string, unknown>>;
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
  | 'deployer_instruction'
  | 'eu_declaration'
  | 'eu_registration'
  | 'ce_marking';

export type GovernanceDocWriteResult =
  | { readonly ok: true; readonly doc: GovernanceDocRecord }
  | {
      readonly ok: false;
      readonly status: 409 | 422;
      readonly reason: string;
      readonly errors?: readonly string[];
    };

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
  ): Promise<GovernanceDocWriteResult>;
}

export function parseGovernanceDocCreate(
  raw: unknown,
): { ok: true; value: GovernanceDocCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  const reason = obj['reason'];
  const expectedVersion = obj['expectedVersion'];
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > 2_000)) {
    errors.push('reason must be a string of at most 2000 characters');
  }
  if (
    expectedVersion !== undefined &&
    (!Number.isSafeInteger(expectedVersion) || (expectedVersion as number) < 0)
  ) {
    errors.push('expectedVersion must be a non-negative integer');
  }

  const explicitData = obj['data'];
  if (
    explicitData !== undefined &&
    (explicitData === null || typeof explicitData !== 'object' || Array.isArray(explicitData))
  ) {
    errors.push('data must be an object');
  }
  if (errors.length > 0) return { ok: false, errors };

  // GenericCommand permits operation-specific properties. Keep accepting the existing flat
  // callers while normalising every command into the canonical data envelope.
  const data =
    explicitData !== undefined
      ? (explicitData as Record<string, unknown>)
      : Object.fromEntries(
          Object.entries(obj).filter(([key]) => key !== 'reason' && key !== 'expectedVersion'),
        );
  return {
    ok: true,
    value: {
      ...(typeof reason === 'string' ? { reason } : {}),
      ...(typeof expectedVersion === 'number' ? { expectedVersion } : {}),
      data,
    },
  };
}

export function parseGovernanceDocId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> =
  ({ ok: true } & T) | { ok: false; status: number; reason: string; errors?: readonly string[] };

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
  return deps.repository.createDoc(actor, docType, input);
}
