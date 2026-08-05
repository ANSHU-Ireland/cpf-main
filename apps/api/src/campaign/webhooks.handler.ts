import {
  listWebhooks,
  createWebhook,
  updateWebhookStatus,
  parseWebhookCreate,
  parseWebhookStatusUpdate,
  parseWebhookId,
  type WebhookRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface WebhookService {
  list(actor: Actor): Promise<HttpResponse>;
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
  updateStatus(actor: Actor, id: string, body: unknown): Promise<HttpResponse>;
}

export function createWebhookService(deps: { repository: WebhookRepository }): WebhookService {
  return {
    list: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await listWebhooks(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
    },
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseWebhookCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createWebhook(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.webhook, correlationId);
    },
    updateStatus: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const wid = parseWebhookId(id);
      if (wid === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const parsed = parseWebhookStatusUpdate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await updateWebhookStatus(deps, actor, wid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.webhook, correlationId);
    },
  };
}

export async function handleListWebhooks(
  svc: WebhookService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  return svc.list(req.actor);
}

export async function handleCreateWebhook(
  svc: WebhookService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}

export async function handleUpdateWebhookStatus(
  svc: WebhookService,
  req: { actor: Actor; webhookId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.updateStatus(req.actor, req.webhookId, req.body);
}
