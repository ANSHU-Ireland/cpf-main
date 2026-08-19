import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { Actor } from './types.js';
import type {
  AiModelCreate,
  AiModelDto,
  AiModelListQuery,
  AiModelRecord,
} from './ai-model-types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export interface RawAiModelListQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

export function parseAiModelListQuery(
  raw: RawAiModelListQuery,
): { ok: true; value: AiModelListQuery } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  let limit = DEFAULT_LIMIT;
  if (raw.limit !== undefined) {
    const n = typeof raw.limit === 'string' ? parseInt(raw.limit, 10) : raw.limit;
    if (Number.isNaN(n) || n < 1) errors.push('limit must be positive');
    else if (n > MAX_LIMIT) errors.push(`limit max ${MAX_LIMIT}`);
    else limit = n;
  }
  let cursor: string | null = null;
  if (raw.cursor !== undefined && raw.cursor !== '') cursor = raw.cursor;
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { limit, cursor } };
}

export function parseAiModelCreate(
  raw: unknown,
): { ok: true; value: AiModelCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object')
    return { ok: false, errors: ['body must be object'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of [
    'provider',
    'modelKey',
    'displayName',
    'modelVersion',
    'intendedPurpose',
    'limitations',
  ] as const) {
    if (typeof obj[key] !== 'string' || (obj[key] as string).length === 0)
      errors.push(`${key} is required`);
  }
  if (errors.length > 0) return { ok: false, errors };
  const value: AiModelCreate = {
    provider: obj['provider'] as string,
    modelKey: obj['modelKey'] as string,
    displayName: obj['displayName'] as string,
    modelVersion: obj['modelVersion'] as string,
    intendedPurpose: obj['intendedPurpose'] as string,
    limitations: obj['limitations'] as string,
  };
  if (typeof obj['dataRegion'] === 'string')
    return { ok: true, value: { ...value, dataRegion: obj['dataRegion'] } };
  return { ok: true, value };
}

export function parseAiModelId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

// --- repository ---

export interface AiModelListResult {
  readonly items: readonly AiModelRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface AiModelRepository {
  listModels(actor: Actor, limit: number, cursor: string | null): Promise<AiModelListResult>;
  getModel(actor: Actor, id: string): Promise<AiModelRecord | null>;
  createModel(actor: Actor, input: AiModelCreate): Promise<AiModelRecord>;
  recordEvaluation(
    actor: Actor,
    id: string,
    input: { readonly outcome: string; readonly rationale: string },
  ): Promise<AiModelRecord | null>;
  activateModel(actor: Actor, id: string): Promise<AiModelRecord | null>;
  suspendModel(actor: Actor, id: string): Promise<AiModelRecord | null>;
}

// --- domain ---

export interface AiModelDeps {
  readonly repository: AiModelRepository;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export type ListAiModelsResult = Result<{
  page: { items: readonly AiModelDto[]; nextCursor: string | null; total: number };
}>;
export type GetAiModelResult = Result<{ model: AiModelDto }>;
export type CreateAiModelResult = Result<{ model: AiModelDto }>;
export type ActivateAiModelResult = Result<{ model: AiModelDto }>;
export type SuspendAiModelResult = Result<{ model: AiModelDto }>;
export type RecordAiModelEvaluationResult = Result<{ model: AiModelDto }>;

export async function listAiModels(
  deps: AiModelDeps,
  actor: Actor,
  query: AiModelListQuery,
): Promise<ListAiModelsResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'ai_model', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const decoded = query.cursor !== null ? decodeCursor(query.cursor) : null;
  const result = await deps.repository.listModels(actor, query.limit, decoded?.id ?? null);
  const items: AiModelDto[] = result.items.map((r) => r);
  const lastItem = items[items.length - 1];
  const nextCursor =
    result.hasMore && lastItem !== undefined
      ? encodeCursor({ ts: lastItem.createdAt, id: lastItem.id })
      : null;
  return { ok: true, page: { items, nextCursor, total: result.total } };
}

export async function getAiModel(
  deps: AiModelDeps,
  actor: Actor,
  id: string,
): Promise<GetAiModelResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'ai_model', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.getModel(actor, id);
  if (record === null) return { ok: false, status: 404, reason: 'AI model not found.' };
  return { ok: true, model: record };
}

export async function createAiModel(
  deps: AiModelDeps,
  actor: Actor,
  input: AiModelCreate,
): Promise<CreateAiModelResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'ai_model', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  try {
    const record = await deps.repository.createModel(actor, input);
    return { ok: true, model: record };
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
      return {
        ok: false,
        status: 409,
        reason: 'AI model with that provider/key/version already exists.',
      };
    }
    throw err;
  }
}

export async function recordAiModelEvaluation(
  deps: AiModelDeps,
  actor: Actor,
  id: string,
  input: { readonly outcome: string; readonly rationale: string },
): Promise<RecordAiModelEvaluationResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'ai_model', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.recordEvaluation(actor, id, input);
  if (record === null) return { ok: false, status: 404, reason: 'AI model not found.' };
  return { ok: true, model: record };
}

export async function activateAiModel(
  deps: AiModelDeps,
  actor: Actor,
  id: string,
): Promise<ActivateAiModelResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'ai_model', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.activateModel(actor, id);
  if (record === null) return { ok: false, status: 404, reason: 'AI model not found.' };
  return { ok: true, model: record };
}

export async function suspendAiModel(
  deps: AiModelDeps,
  actor: Actor,
  id: string,
): Promise<SuspendAiModelResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'ai_model', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.suspendModel(actor, id);
  if (record === null) return { ok: false, status: 404, reason: 'AI model not found.' };
  return { ok: true, model: record };
}
