import {
  listFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  parseFeatureFlagCreate,
  parseFeatureFlagUpdate,
  parseFeatureFlagId,
  type FeatureFlagRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface FeatureFlagService {
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

export function createFeatureFlagService(deps: {
  repository: FeatureFlagRepository;
}): FeatureFlagService {
  return {
    list: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await listFeatureFlags(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
    },
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseFeatureFlagCreate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await createFeatureFlag(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.flag, correlationId);
    },
    update: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const fid = parseFeatureFlagId(id);
      if (fid === null)
        return problemResponse({
          status: 422,
          title: 'Invalid ID',
          correlationId,
          detail: 'flagId must be a valid UUID.',
        });
      const parsed = parseFeatureFlagUpdate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await updateFeatureFlag(deps, actor, fid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.flag, correlationId);
    },
  };
}

export async function handleListFeatureFlags(
  svc: FeatureFlagService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  return svc.list(req.actor);
}

export async function handleCreateFeatureFlag(
  svc: FeatureFlagService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}

export async function handleUpdateFeatureFlag(
  svc: FeatureFlagService,
  req: { actor: Actor; flagId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.update(req.actor, req.flagId, req.body);
}
