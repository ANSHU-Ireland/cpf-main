import {
  getDeployerReadiness,
  updateDeployerReadiness,
  parseDeployerReadinessUpdate,
  type DeployerReadinessRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface DeployerReadinessService {
  get(actor: Actor): Promise<HttpResponse>;
  update(actor: Actor, body: unknown): Promise<HttpResponse>;
}

export function createDeployerReadinessService(deps: {
  repository: DeployerReadinessRepository;
}): DeployerReadinessService {
  return {
    get: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await getDeployerReadiness(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.readiness, correlationId);
    },
    update: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseDeployerReadinessUpdate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await updateDeployerReadiness(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.readiness, correlationId);
    },
  };
}

export async function handleGetDeployerReadiness(
  svc: DeployerReadinessService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  return svc.get(req.actor);
}

export async function handleUpdateDeployerReadiness(
  svc: DeployerReadinessService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.update(req.actor, req.body);
}
