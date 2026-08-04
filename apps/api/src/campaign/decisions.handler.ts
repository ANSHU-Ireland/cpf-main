import {
  listDecisions,
  getDecision,
  approveDecision,
  issueDecision,
  parseDecisionCreate,
  parseDecisionId,
  type DecisionRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface DecisionService {
  list(actor: Actor): ReturnType<typeof listDecisions>;
  get(actor: Actor, id: string): ReturnType<typeof getDecision>;
  approve(actor: Actor, id: string): Promise<HttpResponse>;
  issue(actor: Actor, body: unknown): Promise<HttpResponse>;
}

export function createDecisionService(deps: { repository: DecisionRepository }): DecisionService {
  return {
    list: (actor) => listDecisions(deps, actor),
    get: (actor, id) => getDecision(deps, actor, id),
    approve: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const validId = parseDecisionId(id);
      if (validId === null)
        return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const r = await approveDecision(deps, actor, validId);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.approval, correlationId);
    },
    issue: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseDecisionCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await issueDecision(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.decision, correlationId);
    },
  };
}

export async function handleListDecisions(
  svc: DecisionService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const r = await svc.list(req.actor);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
}

export async function handleGetDecision(
  svc: DecisionService,
  req: { actor: Actor; decisionId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseDecisionId(req.decisionId);
  if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
  const r = await svc.get(req.actor, id);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, r.decision, correlationId);
}

export async function handleApproveDecision(
  svc: DecisionService,
  req: { actor: Actor; decisionId: string },
): Promise<HttpResponse> {
  return svc.approve(req.actor, req.decisionId);
}

export async function handleIssueDecision(
  svc: DecisionService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.issue(req.actor, req.body);
}
