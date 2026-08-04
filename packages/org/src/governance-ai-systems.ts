import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const AI_SYSTEM_STATUSES = [
  'design',
  'validation',
  'pilot',
  'active',
  'suspended',
  'retired',
] as const;
export type AiSystemStatus = (typeof AI_SYSTEM_STATUSES)[number];

export interface AiSystemRecord {
  readonly id: string;
  readonly systemCode: string;
  readonly name: string;
  readonly providerLegalName: string;
  readonly intendedPurpose: string;
  readonly version: string;
  readonly lifecycleStatus: AiSystemStatus;
  readonly ownerUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AiSystemCreate {
  readonly systemCode: string;
  readonly name: string;
  readonly providerLegalName: string;
  readonly intendedPurpose: string;
  readonly version: string;
}

export interface ClassificationCreate {
  readonly highRiskConclusion: boolean;
  readonly territorialScope: string;
  readonly confidence: 'high' | 'medium' | 'low';
}

export interface ClassificationRecord {
  readonly id: string;
  readonly aiSystemId: string;
  readonly versionNo: number;
  readonly highRiskConclusion: boolean;
  readonly territorialScope: string;
  readonly confidence: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface AiSystemRepository {
  listSystems(
    actor: Actor,
    limit: number,
  ): Promise<{ items: readonly AiSystemRecord[]; total: number }>;
  getSystem(actor: Actor, id: string): Promise<AiSystemRecord | null>;
  createSystem(actor: Actor, input: AiSystemCreate): Promise<AiSystemRecord>;
  createClassification(
    actor: Actor,
    systemId: string,
    input: ClassificationCreate,
  ): Promise<ClassificationRecord>;
}

export function parseAiSystemCreate(
  raw: unknown,
): { ok: true; value: AiSystemCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  for (const k of [
    'systemCode',
    'name',
    'providerLegalName',
    'intendedPurpose',
    'version',
  ] as const) {
    if (typeof obj[k] !== 'string' || (obj[k] as string).length === 0) errors.push(`${k} required`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      systemCode: obj['systemCode'] as string,
      name: obj['name'] as string,
      providerLegalName: obj['providerLegalName'] as string,
      intendedPurpose: obj['intendedPurpose'] as string,
      version: obj['version'] as string,
    },
  };
}

export function parseClassificationCreate(
  raw: unknown,
): { ok: true; value: ClassificationCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['highRiskConclusion'] !== 'boolean') errors.push('highRiskConclusion required');
  if (typeof obj['territorialScope'] !== 'string' || obj['territorialScope'].length === 0)
    errors.push('territorialScope required');
  if (
    typeof obj['confidence'] !== 'string' ||
    !['high', 'medium', 'low'].includes(obj['confidence'])
  )
    errors.push('confidence must be high|medium|low');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      highRiskConclusion: obj['highRiskConclusion'] as boolean,
      territorialScope: obj['territorialScope'] as string,
      confidence: obj['confidence'] as 'high' | 'medium' | 'low',
    },
  };
}

export function parseAiSystemId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listAiSystems(
  deps: { repository: AiSystemRepository },
  actor: Actor,
): Promise<Result<{ items: readonly AiSystemRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'ai_system', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.listSystems(actor, 100);
  return { ok: true, items: r.items, total: r.total };
}

export async function getAiSystem(
  deps: { repository: AiSystemRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ system: AiSystemRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'ai_system', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.getSystem(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, system: r };
}

export async function createAiSystem(
  deps: { repository: AiSystemRepository },
  actor: Actor,
  input: AiSystemCreate,
): Promise<Result<{ system: AiSystemRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'ai_system', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  try {
    const r = await deps.repository.createSystem(actor, input);
    return { ok: true, system: r };
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    )
      return { ok: false, status: 409, reason: 'duplicate' };
    throw err;
  }
}

export async function classifyAiSystem(
  deps: { repository: AiSystemRepository },
  actor: Actor,
  systemId: string,
  input: ClassificationCreate,
): Promise<Result<{ classification: ClassificationRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'ai_system', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createClassification(actor, systemId, input);
  return { ok: true, classification: r };
}
