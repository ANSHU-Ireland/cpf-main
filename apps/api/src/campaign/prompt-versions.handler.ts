import {
  listPromptVersions,
  createPromptVersion,
  activatePromptVersion,
  parsePromptVersionCreate,
  parsePromptVersionId,
  type PromptVersionRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface PromptVersionService {
  list(actor: Actor): ReturnType<typeof listPromptVersions>;
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
  activate(actor: Actor, promptId: string): Promise<HttpResponse>;
}

export function createPromptVersionService(deps: {
  repository: PromptVersionRepository;
}): PromptVersionService {
  return {
    list: (actor) => listPromptVersions(deps, actor),
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parsePromptVersionCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createPromptVersion(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.version, correlationId);
    },
    activate: async (actor, promptId) => {
      const correlationId = ensureCorrelationId();
      const id = parsePromptVersionId(promptId);
      if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const r = await activatePromptVersion(deps, actor, id);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.version, correlationId);
    },
  };
}

export async function handleListPromptVersions(
  svc: PromptVersionService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const r = await svc.list(req.actor);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
}

export async function handleCreatePromptVersion(
  svc: PromptVersionService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}

export async function handleActivatePromptVersion(
  svc: PromptVersionService,
  req: { actor: Actor; promptId: string },
): Promise<HttpResponse> {
  return svc.activate(req.actor, req.promptId);
}
