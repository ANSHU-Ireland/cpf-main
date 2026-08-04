import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { CampaignRepository } from './campaign-repository.js';
import type { Actor } from './types.js';
import type { CampaignDto, CampaignStatus } from './campaign-types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_TRANSITIONS: Record<string, readonly CampaignStatus[]> = {
  activate: ['draft', 'paused'],
  pause: ['active'],
  close: ['active', 'paused'],
  archive: ['closed'],
};

export interface CampaignLifecycleDeps {
  readonly repository: CampaignRepository;
  readonly permissions?: readonly Permission[];
}

export type TransitionCampaignResult =
  | { readonly ok: true; readonly campaign: CampaignDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string }
  | { readonly ok: false; readonly status: 409; readonly reason: string };

export type DuplicateCampaignResult =
  | { readonly ok: true; readonly campaign: CampaignDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string }
  | { readonly ok: false; readonly status: 409; readonly reason: string }
  | { readonly ok: false; readonly status: 422; readonly reason: string };

export function parseCampaignIdParam(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export interface DuplicateInput {
  readonly newCode: string;
}

export type ParseDuplicateInputResult =
  | { readonly ok: true; readonly value: DuplicateInput }
  | { readonly ok: false; readonly errors: readonly string[] };

const MAX_CODE = 100;
const DUPLICATE_KEYS = new Set(['newCode']);

export function parseDuplicateInput(raw: unknown): ParseDuplicateInputResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!DUPLICATE_KEYS.has(key)) errors.push(`unknown property: ${key}`);
  }

  if (
    typeof input.newCode !== 'string' ||
    input.newCode.length === 0 ||
    input.newCode.length > MAX_CODE
  ) {
    errors.push(`newCode must be a non-empty string up to ${MAX_CODE} chars`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { newCode: input.newCode as string } };
}

async function transitionCampaign(
  deps: CampaignLifecycleDeps,
  actor: Actor,
  id: string,
  action: string,
  toStatus: CampaignStatus,
): Promise<TransitionCampaignResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'campaign', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  const validFrom = VALID_TRANSITIONS[action];
  if (!validFrom) return { ok: false, status: 409, reason: `Unknown action: ${action}` };

  const result = await deps.repository.transitionStatus(actor, id, toStatus, validFrom);
  if (result === 'not_found') return { ok: false, status: 404, reason: 'Campaign not found.' };
  if (result === 'invalid_status') {
    return {
      ok: false,
      status: 409,
      reason: `Campaign cannot be ${action}d from its current status.`,
    };
  }
  return { ok: true, campaign: result };
}

export function activateCampaign(
  deps: CampaignLifecycleDeps,
  actor: Actor,
  id: string,
): Promise<TransitionCampaignResult> {
  return transitionCampaign(deps, actor, id, 'activate', 'active');
}

export function pauseCampaign(
  deps: CampaignLifecycleDeps,
  actor: Actor,
  id: string,
): Promise<TransitionCampaignResult> {
  return transitionCampaign(deps, actor, id, 'pause', 'paused');
}

export function closeCampaign(
  deps: CampaignLifecycleDeps,
  actor: Actor,
  id: string,
): Promise<TransitionCampaignResult> {
  return transitionCampaign(deps, actor, id, 'close', 'closed');
}

export function archiveCampaign(
  deps: CampaignLifecycleDeps,
  actor: Actor,
  id: string,
): Promise<TransitionCampaignResult> {
  return transitionCampaign(deps, actor, id, 'archive', 'archived');
}

export async function duplicateCampaign(
  deps: CampaignLifecycleDeps,
  actor: Actor,
  id: string,
  input: DuplicateInput,
): Promise<DuplicateCampaignResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'campaign', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };

  try {
    const result = await deps.repository.duplicateCampaign(actor, id, input.newCode);
    if (result === null) return { ok: false, status: 404, reason: 'Campaign not found.' };
    return { ok: true, campaign: result };
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Record<string, unknown>).code === '23505'
    ) {
      return { ok: false, status: 409, reason: 'A campaign with that code already exists.' };
    }
    throw err;
  }
}
