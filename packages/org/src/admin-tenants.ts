import { can } from '@cpf/policy';
import { ADMIN_PERMISSIONS } from './admin-permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TENANT_STATUSES = [
  'draft',
  'pending_approval',
  'active',
  'suspended',
  'terminated',
] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export interface TenantRecord {
  readonly id: string;
  readonly slug: string;
  readonly legalName: string;
  readonly status: TenantStatus;
  readonly dataRegion: string;
  readonly subscriptionPlanId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TenantCreate {
  readonly slug: string;
  readonly legalName: string;
  readonly dataRegion: string;
}

export interface TenantUpdate {
  readonly legalName?: string;
  readonly dataRegion?: string;
}

export interface TenantStatusChange {
  readonly status: TenantStatus;
  readonly reason: string;
}

export interface TenantStatusPreview {
  readonly currentStatus: TenantStatus;
  readonly targetStatus: TenantStatus;
  readonly allowed: boolean;
  readonly effects: readonly string[];
}

export interface TenantSubscriptionChange {
  readonly planId: string;
}

export interface TenantRepository {
  listTenants(actor: Actor): Promise<{ items: readonly TenantRecord[]; total: number }>;
  getTenant(actor: Actor, id: string): Promise<TenantRecord | null>;
  createTenant(actor: Actor, input: TenantCreate): Promise<TenantRecord>;
  updateTenant(actor: Actor, id: string, input: TenantUpdate): Promise<TenantRecord | null>;
  changeTenantStatus(
    actor: Actor,
    id: string,
    input: TenantStatusChange,
  ): Promise<TenantRecord | null>;
  previewTenantStatus(
    actor: Actor,
    id: string,
    input: TenantStatusChange,
  ): Promise<TenantStatusPreview | null>;
  changeTenantSubscription(
    actor: Actor,
    id: string,
    input: TenantSubscriptionChange,
  ): Promise<TenantRecord | null>;
}

const VALID_STATUSES: ReadonlySet<string> = new Set(TENANT_STATUSES);
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function parseTenantCreate(
  raw: unknown,
): { ok: true; value: TenantCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['slug'] !== 'string' || !SLUG_RE.test(obj['slug']))
    errors.push('slug must be a valid DNS-safe label');
  if (typeof obj['legalName'] !== 'string' || obj['legalName'].length === 0)
    errors.push('legalName required');
  if (typeof obj['dataRegion'] !== 'string' || obj['dataRegion'].length === 0)
    errors.push('dataRegion required');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      slug: obj['slug'] as string,
      legalName: obj['legalName'] as string,
      dataRegion: obj['dataRegion'] as string,
    },
  };
}

export function parseTenantUpdate(
  raw: unknown,
): { ok: true; value: TenantUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: { legalName?: string; dataRegion?: string } = {};
  for (const key of Object.keys(obj)) {
    if (key !== 'legalName' && key !== 'dataRegion') errors.push(`unknown property '${key}'`);
  }
  if ('legalName' in obj) {
    if (typeof obj['legalName'] !== 'string' || obj['legalName'].length === 0)
      errors.push('legalName must be a non-empty string');
    else value.legalName = obj['legalName'];
  }
  if ('dataRegion' in obj) {
    if (typeof obj['dataRegion'] !== 'string' || obj['dataRegion'].length === 0)
      errors.push('dataRegion must be a non-empty string');
    else value.dataRegion = obj['dataRegion'];
  }
  if (errors.length > 0) return { ok: false, errors };
  if (Object.keys(value).length === 0)
    return { ok: false, errors: ['at least one field required'] };
  return { ok: true, value };
}

export function parseTenantStatusChange(
  raw: unknown,
): { ok: true; value: TenantStatusChange } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['status'] !== 'string' || !VALID_STATUSES.has(obj['status']))
    errors.push('status must be a valid tenant status');
  if (typeof obj['reason'] !== 'string' || obj['reason'].length === 0)
    errors.push('reason required');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { status: obj['status'] as TenantStatus, reason: obj['reason'] as string },
  };
}

export function parseTenantSubscriptionChange(
  raw: unknown,
): { ok: true; value: TenantSubscriptionChange } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  if (typeof obj['planId'] !== 'string' || !UUID_RE.test(obj['planId']))
    return { ok: false, errors: ['planId must be a UUID'] };
  return { ok: true, value: { planId: obj['planId'] } };
}

export function parseTenantId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor, action: 'read' | 'write'): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles, isPlatformStaff: true },
    action,
    { type: 'platform_tenant', tenantId: actor.tenantId },
    ADMIN_PERMISSIONS,
  ).allowed;
}

export async function listTenants(
  deps: { repository: TenantRepository },
  actor: Actor,
): Promise<Result<{ items: readonly TenantRecord[]; total: number }>> {
  if (!authorize(actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  return { ok: true, ...(await deps.repository.listTenants(actor)) };
}

export async function getTenant(
  deps: { repository: TenantRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ tenant: TenantRecord }>> {
  if (!authorize(actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.getTenant(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, tenant: r };
}

export async function createTenant(
  deps: { repository: TenantRepository },
  actor: Actor,
  input: TenantCreate,
): Promise<Result<{ tenant: TenantRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.createTenant(actor, input);
  return { ok: true, tenant: r };
}

export async function updateTenant(
  deps: { repository: TenantRepository },
  actor: Actor,
  id: string,
  input: TenantUpdate,
): Promise<Result<{ tenant: TenantRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.updateTenant(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, tenant: r };
}

export async function changeTenantStatus(
  deps: { repository: TenantRepository },
  actor: Actor,
  id: string,
  input: TenantStatusChange,
): Promise<Result<{ tenant: TenantRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.changeTenantStatus(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, tenant: r };
}

export async function previewTenantStatus(
  deps: { repository: TenantRepository },
  actor: Actor,
  id: string,
  input: TenantStatusChange,
): Promise<Result<{ preview: TenantStatusPreview }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.previewTenantStatus(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, preview: r };
}

export async function changeTenantSubscription(
  deps: { repository: TenantRepository },
  actor: Actor,
  id: string,
  input: TenantSubscriptionChange,
): Promise<Result<{ tenant: TenantRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.changeTenantSubscription(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, tenant: r };
}
