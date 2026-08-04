import {
  listAiSystems,
  getAiSystem,
  createAiSystem,
  classifyAiSystem,
  parseAiSystemCreate,
  parseAiSystemId,
  parseClassificationCreate,
  type AiSystemRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface AiSystemService {
  list(actor: Actor): ReturnType<typeof listAiSystems>;
  get(actor: Actor, id: string): ReturnType<typeof getAiSystem>;
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
  classify(actor: Actor, systemId: string, body: unknown): Promise<HttpResponse>;
}

export function createAiSystemService(deps: { repository: AiSystemRepository }): AiSystemService {
  return {
    list: (actor) => listAiSystems(deps, actor),
    get: (actor, id) => getAiSystem(deps, actor, id),
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseAiSystemCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createAiSystem(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.system, correlationId);
    },
    classify: async (actor, systemId, body) => {
      const correlationId = ensureCorrelationId();
      const id = parseAiSystemId(systemId);
      if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const parsed = parseClassificationCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await classifyAiSystem(deps, actor, id, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.classification, correlationId);
    },
  };
}

export async function handleListAiSystems(
  svc: AiSystemService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const r = await svc.list(req.actor);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
}

export async function handleGetAiSystem(
  svc: AiSystemService,
  req: { actor: Actor; systemId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseAiSystemId(req.systemId);
  if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
  const r = await svc.get(req.actor, id);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, r.system, correlationId);
}

export async function handleCreateAiSystem(
  svc: AiSystemService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}

export async function handleClassifyAiSystem(
  svc: AiSystemService,
  req: { actor: Actor; systemId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.classify(req.actor, req.systemId, req.body);
}
