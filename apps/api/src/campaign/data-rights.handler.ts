import {
  listDataRightRequests,
  createDataRightRequest,
  createComplaint,
  parseDataRightRequestCreate,
  parseComplaintCreate,
  type DataRightsRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface DataRightsService {
  listDataRights(actor: Actor): ReturnType<typeof listDataRightRequests>;
  createDataRight(actor: Actor, body: unknown): Promise<HttpResponse>;
  createComplaint(actor: Actor, body: unknown): Promise<HttpResponse>;
}

export function createDataRightsService(deps: {
  repository: DataRightsRepository;
}): DataRightsService {
  return {
    listDataRights: (actor) => listDataRightRequests(deps, actor),
    createDataRight: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseDataRightRequestCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createDataRightRequest(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.request, correlationId);
    },
    createComplaint: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseComplaintCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createComplaint(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.complaint, correlationId);
    },
  };
}

export async function handleListDataRights(
  svc: DataRightsService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const r = await svc.listDataRights(req.actor);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
}

export async function handleCreateDataRight(
  svc: DataRightsService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.createDataRight(req.actor, req.body);
}

export async function handleCreateComplaint(
  svc: DataRightsService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.createComplaint(req.actor, req.body);
}
