import {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  changeTenantStatus,
  previewTenantStatus,
  changeTenantSubscription,
  parseTenantCreate,
  parseTenantUpdate,
  parseTenantStatusChange,
  parseTenantSubscriptionChange,
  parseTenantId,
  type TenantRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface TenantService {
  list(actor: Actor): Promise<HttpResponse>;
  get(actor: Actor, id: string): Promise<HttpResponse>;
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
  update(actor: Actor, id: string, body: unknown): Promise<HttpResponse>;
  changeStatus(actor: Actor, id: string, body: unknown): Promise<HttpResponse>;
  previewStatus(actor: Actor, id: string, body: unknown): Promise<HttpResponse>;
  changeSubscription(actor: Actor, id: string, body: unknown): Promise<HttpResponse>;
}

function invalidId(correlationId: string): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Invalid ID',
    correlationId,
    detail: 'tenantId must be a valid UUID.',
  });
}

function validationProblem(correlationId: string, errors: string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Validation',
    correlationId,
    errors: errors.map((message) => ({ detail: message })),
  });
}

export function createTenantService(deps: { repository: TenantRepository }): TenantService {
  return {
    list: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await listTenants(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
    },
    get: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const tid = parseTenantId(id);
      if (tid === null) return invalidId(correlationId);
      const r = await getTenant(deps, actor, tid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.tenant, correlationId);
    },
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseTenantCreate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await createTenant(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.tenant, correlationId);
    },
    update: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const tid = parseTenantId(id);
      if (tid === null) return invalidId(correlationId);
      const parsed = parseTenantUpdate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await updateTenant(deps, actor, tid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.tenant, correlationId);
    },
    changeStatus: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const tid = parseTenantId(id);
      if (tid === null) return invalidId(correlationId);
      const parsed = parseTenantStatusChange(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await changeTenantStatus(deps, actor, tid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.tenant, correlationId);
    },
    previewStatus: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const tid = parseTenantId(id);
      if (tid === null) return invalidId(correlationId);
      const parsed = parseTenantStatusChange(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await previewTenantStatus(deps, actor, tid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.preview, correlationId);
    },
    changeSubscription: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const tid = parseTenantId(id);
      if (tid === null) return invalidId(correlationId);
      const parsed = parseTenantSubscriptionChange(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await changeTenantSubscription(deps, actor, tid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.tenant, correlationId);
    },
  };
}

export async function handleListTenants(
  svc: TenantService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  return svc.list(req.actor);
}

export async function handleGetTenant(
  svc: TenantService,
  req: { actor: Actor; tenantId: string },
): Promise<HttpResponse> {
  return svc.get(req.actor, req.tenantId);
}

export async function handleCreateTenant(
  svc: TenantService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}

export async function handleUpdateTenant(
  svc: TenantService,
  req: { actor: Actor; tenantId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.update(req.actor, req.tenantId, req.body);
}

export async function handleChangeTenantStatus(
  svc: TenantService,
  req: { actor: Actor; tenantId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.changeStatus(req.actor, req.tenantId, req.body);
}

export async function handlePreviewTenantStatus(
  svc: TenantService,
  req: { actor: Actor; tenantId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.previewStatus(req.actor, req.tenantId, req.body);
}

export async function handleChangeTenantSubscription(
  svc: TenantService,
  req: { actor: Actor; tenantId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.changeSubscription(req.actor, req.tenantId, req.body);
}
