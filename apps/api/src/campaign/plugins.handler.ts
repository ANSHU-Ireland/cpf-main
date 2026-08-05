import {
  listPlugins,
  createPlugin,
  updatePluginStatus,
  parsePluginCreate,
  parsePluginStatusUpdate,
  parsePluginId,
  type PluginRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface PluginService {
  list(actor: Actor): Promise<HttpResponse>;
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
  updateStatus(actor: Actor, id: string, body: unknown): Promise<HttpResponse>;
}

function validationProblem(correlationId: string, errors: string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Validation',
    correlationId,
    errors: errors.map((message) => ({ detail: message })),
  });
}

export function createPluginService(deps: { repository: PluginRepository }): PluginService {
  return {
    list: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await listPlugins(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
    },
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parsePluginCreate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await createPlugin(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.plugin, correlationId);
    },
    updateStatus: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const pid = parsePluginId(id);
      if (pid === null)
        return problemResponse({
          status: 422,
          title: 'Invalid ID',
          correlationId,
          detail: 'pluginId must be a valid UUID.',
        });
      const parsed = parsePluginStatusUpdate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await updatePluginStatus(deps, actor, pid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.plugin, correlationId);
    },
  };
}

export async function handleListPlugins(
  svc: PluginService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  return svc.list(req.actor);
}

export async function handleCreatePlugin(
  svc: PluginService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}

export async function handleUpdatePluginStatus(
  svc: PluginService,
  req: { actor: Actor; pluginId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.updateStatus(req.actor, req.pluginId, req.body);
}
