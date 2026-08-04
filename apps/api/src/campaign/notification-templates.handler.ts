import { listNotificationTemplates, type NotificationTemplateRepository } from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface NotificationTemplateService {
  list(actor: Actor): ReturnType<typeof listNotificationTemplates>;
}

export function createNotificationTemplateService(deps: {
  repository: NotificationTemplateRepository;
}): NotificationTemplateService {
  return {
    list: (actor) => listNotificationTemplates(deps, actor),
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
