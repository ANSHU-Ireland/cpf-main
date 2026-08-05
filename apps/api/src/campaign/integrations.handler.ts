import {
  listIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  rotateIntegration,
  parseIntegrationCreate,
  parseIntegrationUpdate,
  parseIntegrationId,
  type IntegrationRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface IntegrationService {
  list(actor: Actor): ReturnType<typeof listIntegrations>;
  get(actor: Actor, id: string): ReturnType<typeof getIntegration>;
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
  update(actor: Actor, id: string, body: unknown): Promise<HttpResponse>;
  rotate(actor: Actor, id: string): Promise<HttpResponse>;
}

export function createIntegrationService(deps: {
  repository: IntegrationRepository;
}): IntegrationService {
  return {
    list: (actor) => listIntegrations(deps, actor),
    get: (actor, id) => getIntegration(deps, actor, id),
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseIntegrationCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createIntegration(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.integration, correlationId);
    },
    update: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const validId = parseIntegrationId(id);
      if (validId === null)
        return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const parsed = parseIntegrationUpdate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await updateIntegration(deps, actor, validId, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.integration, correlationId);
    },
    rotate: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const validId = parseIntegrationId(id);
      if (validId === null)
        return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const r = await rotateIntegration(deps, actor, validId);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.integration, correlationId);
    },
  };
}

export async function handleListIntegrations(
  svc: IntegrationService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const r = await svc.list(req.actor);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
}

export async function handleGetIntegration(
  svc: IntegrationService,
  req: { actor: Actor; integrationId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseIntegrationId(req.integrationId);
  if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
  const r = await svc.get(req.actor, id);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, r.integration, correlationId);
}

export async function handleCreateIntegration(
  svc: IntegrationService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}

export async function handleUpdateIntegration(
  svc: IntegrationService,
  req: { actor: Actor; integrationId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.update(req.actor, req.integrationId, req.body);
}

export async function handleRotateIntegration(
  svc: IntegrationService,
  req: { actor: Actor; integrationId: string },
): Promise<HttpResponse> {
  return svc.rotate(req.actor, req.integrationId);
}
