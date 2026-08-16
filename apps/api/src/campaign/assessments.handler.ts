import {
  listAssessments,
  getAssessment,
  createAssessment,
  parseAssessmentListQuery,
  parseAssessmentCreate,
  parseAssessmentId,
  type AssessmentDeps,
  type ListAssessmentsResult,
  type GetAssessmentResult,
  type CreateAssessmentResult,
  type RawAssessmentListQuery,
} from '@cpf/org';
import type { Actor, AssessmentCreate, AssessmentListQuery } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface AssessmentService {
  listAssessments(actor: Actor, query: AssessmentListQuery): Promise<ListAssessmentsResult>;
  getAssessment(actor: Actor, id: string): Promise<GetAssessmentResult>;
  createAssessment(actor: Actor, input: AssessmentCreate): Promise<CreateAssessmentResult>;
}

export function createAssessmentService(deps: AssessmentDeps): AssessmentService {
  return {
    listAssessments: (actor, query) => listAssessments(deps, actor, query),
    getAssessment: (actor, id) => getAssessment(deps, actor, id),
    createAssessment: (actor, input) => createAssessment(deps, actor, input),
  };
}

export async function handleGetAssessments(
  service: AssessmentService,
  req: { actor: Actor; query: RawAssessmentListQuery },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const parsed = parseAssessmentListQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: parsed.errors.join(', '),
    });
  }
  const result = await service.listAssessments(req.actor, parsed.value);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.page, correlationId);
}

export async function handleGetAssessment(
  service: AssessmentService,
  req: { actor: Actor; assessmentId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseAssessmentId(req.assessmentId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await service.getAssessment(req.actor, id);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.assessment, correlationId);
}

export async function handlePostAssessment(
  service: AssessmentService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const body =
    req.body !== null && typeof req.body === 'object' && !Array.isArray(req.body)
      ? { ...(req.body as Record<string, unknown>), ownerUserId: req.actor.userId }
      : req.body;
  const parsed = parseAssessmentCreate(body);
  if (!parsed.ok)
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: parsed.errors.join(', '),
    });
  const result = await service.createAssessment(req.actor, parsed.value);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(201, result.assessment, correlationId);
}
