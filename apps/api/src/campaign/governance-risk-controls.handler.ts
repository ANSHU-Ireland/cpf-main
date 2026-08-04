import {
  listRiskControls,
  getRiskControl,
  createRiskControl,
  parseRiskControlCreate,
  parseRiskControlId,
  type RiskControlRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface RiskControlService {
  list(actor: Actor): ReturnType<typeof listRiskControls>;
  get(actor: Actor, id: string): ReturnType<typeof getRiskControl>;
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
}

export function createRiskControlService(deps: {
  repository: RiskControlRepository;
}): RiskControlService {
  return {
    list: (actor) => listRiskControls(deps, actor),
    get: (actor, id) => getRiskControl(deps, actor, id),
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseRiskControlCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createRiskControl(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.control, correlationId);
    },
  };
}

export async function handleListRiskControls(
  svc: RiskControlService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const r = await svc.list(req.actor);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
}

export async function handleGetRiskControl(
  svc: RiskControlService,
  req: { actor: Actor; controlId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseRiskControlId(req.controlId);
  if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
  const r = await svc.get(req.actor, id);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, r.control, correlationId);
}

export async function handleCreateRiskControl(
  svc: RiskControlService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}
