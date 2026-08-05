import {
  listNotificationTemplates,
  createNotificationTemplate,
  activateNotificationTemplate,
  previewNotificationTemplate,
  testSendNotificationTemplate,
  parseNotificationTemplateCreate,
  parseNotificationTemplatePreview,
  parseNotificationTemplateTestSend,
  parseNotificationTemplateId,
  type NotificationTemplateRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface NotificationTemplateService {
  list(actor: Actor): ReturnType<typeof listNotificationTemplates>;
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
  activate(actor: Actor, id: string): Promise<HttpResponse>;
  preview(actor: Actor, id: string, body: unknown): Promise<HttpResponse>;
  testSend(actor: Actor, id: string, body: unknown): Promise<HttpResponse>;
}

function validationProblem(correlationId: string, errors: string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Validation',
    correlationId,
    errors: errors.map((message) => ({ detail: message })),
  });
}

function invalidId(correlationId: string): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Invalid ID',
    correlationId,
    detail: 'templateId must be a valid UUID.',
  });
}

export function createNotificationTemplateService(deps: {
  repository: NotificationTemplateRepository;
}): NotificationTemplateService {
  return {
    list: (actor) => listNotificationTemplates(deps, actor),
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseNotificationTemplateCreate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await createNotificationTemplate(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.template, correlationId);
    },
    activate: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const tid = parseNotificationTemplateId(id);
      if (tid === null) return invalidId(correlationId);
      const r = await activateNotificationTemplate(deps, actor, tid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.template, correlationId);
    },
    preview: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const tid = parseNotificationTemplateId(id);
      if (tid === null) return invalidId(correlationId);
      const parsed = parseNotificationTemplatePreview(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await previewNotificationTemplate(deps, actor, tid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.rendered, correlationId);
    },
    testSend: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const tid = parseNotificationTemplateId(id);
      if (tid === null) return invalidId(correlationId);
      const parsed = parseNotificationTemplateTestSend(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await testSendNotificationTemplate(deps, actor, tid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(202, r.result, correlationId);
    },
  };
}

export async function handleListNotificationTemplates(
  svc: NotificationTemplateService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const r = await svc.list(req.actor);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
}

export async function handleCreateNotificationTemplate(
  svc: NotificationTemplateService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}

export async function handleActivateNotificationTemplate(
  svc: NotificationTemplateService,
  req: { actor: Actor; templateId: string },
): Promise<HttpResponse> {
  return svc.activate(req.actor, req.templateId);
}

export async function handlePreviewNotificationTemplate(
  svc: NotificationTemplateService,
  req: { actor: Actor; templateId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.preview(req.actor, req.templateId, req.body);
}

export async function handleTestSendNotificationTemplate(
  svc: NotificationTemplateService,
  req: { actor: Actor; templateId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.testSend(req.actor, req.templateId, req.body);
}
