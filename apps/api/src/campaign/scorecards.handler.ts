import {
  getScorecard,
  updateScorecard,
  submitScorecard,
  parseScorecardAssignmentId,
  parseScorecardUpdate,
  type ScorecardRepository,
  type GetScorecardResult,
  type UpdateScorecardResult,
} from '@cpf/org';
import type { Actor, ScorecardUpdate } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface ScorecardService {
  getScorecard(actor: Actor, assignmentId: string): Promise<GetScorecardResult>;
  updateScorecard(
    actor: Actor,
    assignmentId: string,
    input: ScorecardUpdate,
  ): Promise<UpdateScorecardResult>;
  submitScorecard(actor: Actor, assignmentId: string): Promise<UpdateScorecardResult>;
}

export function createScorecardService(deps: {
  repository: ScorecardRepository;
}): ScorecardService {
  return {
    getScorecard: (actor, aId) => getScorecard(deps, actor, aId),
    updateScorecard: (actor, aId, input) => updateScorecard(deps, actor, aId, input),
    submitScorecard: (actor, aId) => submitScorecard(deps, actor, aId),
  };
}

export async function handleGetScorecard(
  svc: ScorecardService,
  req: { actor: Actor; assignmentId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseScorecardAssignmentId(req.assignmentId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await svc.getScorecard(req.actor, id);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.scorecard, correlationId);
}

export async function handlePutScorecard(
  svc: ScorecardService,
  req: { actor: Actor; assignmentId: string; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseScorecardAssignmentId(req.assignmentId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const parsed = parseScorecardUpdate(req.body);
  if (!parsed.ok)
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: parsed.errors.join(', '),
    });
  const result = await svc.updateScorecard(req.actor, id, parsed.value);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.scorecard, correlationId);
}

export async function handleSubmitScorecard(
  svc: ScorecardService,
  req: { actor: Actor; assignmentId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseScorecardAssignmentId(req.assignmentId);
  if (id === null) {
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  }
  const result = await svc.submitScorecard(req.actor, id);
  if (!result.ok) {
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  }
  return jsonResponse(200, result.scorecard, correlationId);
}
