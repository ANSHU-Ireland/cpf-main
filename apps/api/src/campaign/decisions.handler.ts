import {
  approveDecision,
  createDecision,
  issueDecision,
  parseDecisionApplicationId,
  parseDecisionApproval,
  parseDecisionCreate,
  parseDecisionId,
  parseIdempotencyKey,
  type Actor,
  type DecisionApprovalInput,
  type DecisionCreate,
  type DecisionRepository,
} from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface DecisionService {
  create(
    actor: Actor,
    applicationId: string,
    input: DecisionCreate,
    idempotencyKey: string,
  ): ReturnType<typeof createDecision>;
  approve(
    actor: Actor,
    decisionId: string,
    input: DecisionApprovalInput,
    idempotencyKey: string,
  ): ReturnType<typeof approveDecision>;
  issue(actor: Actor, decisionId: string, idempotencyKey: string): ReturnType<typeof issueDecision>;
}

export function createDecisionService(deps: { repository: DecisionRepository }): DecisionService {
  return {
    create: (actor, applicationId, input, idempotencyKey) =>
      createDecision(deps, actor, applicationId, input, idempotencyKey),
    approve: (actor, decisionId, input, idempotencyKey) =>
      approveDecision(deps, actor, decisionId, input, idempotencyKey),
    issue: (actor, decisionId, idempotencyKey) =>
      issueDecision(deps, actor, decisionId, idempotencyKey),
  };
}

function invalidIdempotencyKey(correlationId: string): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Unprocessable Entity',
    detail: 'Idempotency-Key must contain between 8 and 200 characters.',
    correlationId,
  });
}

function validationResponse(correlationId: string, errors: readonly string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Unprocessable Entity',
    detail: 'The request body failed validation.',
    correlationId,
    errors: errors.map((detail) => ({ detail })),
  });
}

function resultProblem(
  result: { readonly status: 403 | 404 | 409; readonly reason: string },
  correlationId: string,
): HttpResponse {
  return problemResponse({
    status: result.status,
    title: result.status === 403 ? 'Forbidden' : result.status === 404 ? 'Not Found' : 'Conflict',
    detail: result.reason,
    correlationId,
  });
}

export async function handleCreateDecision(
  service: DecisionService,
  req: {
    readonly actor: Actor;
    readonly applicationId: string;
    readonly body: unknown;
    readonly idempotencyKey: string;
    readonly correlationId?: string;
  },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const applicationId = parseDecisionApplicationId(req.applicationId);
  if (applicationId === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      detail: 'applicationId must be a valid UUID.',
      correlationId,
    });
  }
  const idempotencyKey = parseIdempotencyKey(req.idempotencyKey);
  if (idempotencyKey === null) return invalidIdempotencyKey(correlationId);
  const parsed = parseDecisionCreate(req.body);
  if (!parsed.ok) return validationResponse(correlationId, parsed.errors);
  const result = await service.create(req.actor, applicationId, parsed.value, idempotencyKey);
  return result.ok
    ? jsonResponse(200, result.decision, correlationId)
    : resultProblem(result, correlationId);
}

export async function handleApproveDecision(
  service: DecisionService,
  req: {
    readonly actor: Actor;
    readonly decisionId: string;
    readonly body: unknown;
    readonly idempotencyKey: string;
    readonly correlationId?: string;
  },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const decisionId = parseDecisionId(req.decisionId);
  if (decisionId === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      detail: 'decisionId must be a valid UUID.',
      correlationId,
    });
  }
  const idempotencyKey = parseIdempotencyKey(req.idempotencyKey);
  if (idempotencyKey === null) return invalidIdempotencyKey(correlationId);
  const parsed = parseDecisionApproval(req.body);
  if (!parsed.ok) return validationResponse(correlationId, parsed.errors);
  const result = await service.approve(req.actor, decisionId, parsed.value, idempotencyKey);
  return result.ok
    ? jsonResponse(200, result.decision, correlationId)
    : resultProblem(result, correlationId);
}

export async function handleIssueDecision(
  service: DecisionService,
  req: {
    readonly actor: Actor;
    readonly decisionId: string;
    readonly idempotencyKey: string;
    readonly correlationId?: string;
  },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const decisionId = parseDecisionId(req.decisionId);
  if (decisionId === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      detail: 'decisionId must be a valid UUID.',
      correlationId,
    });
  }
  const idempotencyKey = parseIdempotencyKey(req.idempotencyKey);
  if (idempotencyKey === null) return invalidIdempotencyKey(correlationId);
  const result = await service.issue(req.actor, decisionId, idempotencyKey);
  return result.ok
    ? jsonResponse(200, result.decision, correlationId)
    : resultProblem(result, correlationId);
}
