import {
  listReviewAssignments,
  getReviewAssignment,
  createReviewAssignment,
  acceptReviewAssignment,
  parseReviewAssignmentListQuery,
  parseReviewAssignmentCreate,
  parseAssignmentId,
  type ReviewAssignmentDeps,
  type ListAssignmentsResult,
  type GetAssignmentResult,
  type CreateAssignmentResult,
  type AcceptAssignmentResult,
  type RawReviewAssignmentListQuery,
} from '@cpf/org';
import type { Actor, ReviewAssignmentCreate, ReviewAssignmentListQuery } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface ReviewAssignmentService {
  listAssignments(actor: Actor, query: ReviewAssignmentListQuery): Promise<ListAssignmentsResult>;
  getAssignment(actor: Actor, id: string): Promise<GetAssignmentResult>;
  createAssignment(actor: Actor, input: ReviewAssignmentCreate): Promise<CreateAssignmentResult>;
  acceptAssignment(actor: Actor, id: string): Promise<AcceptAssignmentResult>;
}

export function createReviewAssignmentService(deps: ReviewAssignmentDeps): ReviewAssignmentService {
  return {
    listAssignments: (actor, q) => listReviewAssignments(deps, actor, q),
    getAssignment: (actor, id) => getReviewAssignment(deps, actor, id),
    createAssignment: (actor, input) => createReviewAssignment(deps, actor, input),
    acceptAssignment: (actor, id) => acceptReviewAssignment(deps, actor, id),
  };
}

export async function handleGetReviewAssignments(
  svc: ReviewAssignmentService,
  req: { actor: Actor; query: RawReviewAssignmentListQuery },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const parsed = parseReviewAssignmentListQuery(req.query);
  if (!parsed.ok)
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: parsed.errors.join(', '),
    });
  const result = await svc.listAssignments(req.actor, parsed.value);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.page, correlationId);
}

export async function handleGetReviewAssignment(
  svc: ReviewAssignmentService,
  req: { actor: Actor; assignmentId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseAssignmentId(req.assignmentId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await svc.getAssignment(req.actor, id);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.assignment, correlationId);
}

export async function handlePostReviewAssignment(
  svc: ReviewAssignmentService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const parsed = parseReviewAssignmentCreate(req.body);
  if (!parsed.ok)
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: parsed.errors.join(', '),
    });
  const result = await svc.createAssignment(req.actor, parsed.value);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(201, result.assignment, correlationId);
}

export async function handlePostAcceptAssignment(
  svc: ReviewAssignmentService,
  req: { actor: Actor; assignmentId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseAssignmentId(req.assignmentId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await svc.acceptAssignment(req.actor, id);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.assignment, correlationId);
}
