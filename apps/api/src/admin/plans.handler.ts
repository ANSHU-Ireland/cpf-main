import {
  listPlans,
  createPlan,
  updatePlan,
  parsePlanCreate,
  parsePlanUpdate,
  parsePlanId,
  type PlanRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface PlanService {
  list(actor: Actor): Promise<HttpResponse>;
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
  update(actor: Actor, id: string, body: unknown): Promise<HttpResponse>;
}

function validationProblem(correlationId: string, errors: string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Validation',
    correlationId,
    errors: errors.map((message) => ({ detail: message })),
  });
}

export function createPlanService(deps: { repository: PlanRepository }): PlanService {
  return {
    list: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await listPlans(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
    },
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parsePlanCreate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await createPlan(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.plan, correlationId);
    },
    update: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const pid = parsePlanId(id);
      if (pid === null)
        return problemResponse({
          status: 422,
          title: 'Invalid ID',
          correlationId,
          detail: 'planId must be a valid UUID.',
        });
      const parsed = parsePlanUpdate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await updatePlan(deps, actor, pid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.plan, correlationId);
    },
  };
}

export async function handleListPlans(
  svc: PlanService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  return svc.list(req.actor);
}

export async function handleCreatePlan(
  svc: PlanService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}

export async function handleUpdatePlan(
  svc: PlanService,
  req: { actor: Actor; planId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.update(req.actor, req.planId, req.body);
}
