import {
  listReviewAssignments,
  getReviewAssignment,
  createReviewAssignment,
  acceptReviewAssignment,
  stopReviewAssignmentAi,
  declineReviewAssignment,
  addReviewAssignmentAnnotation,
  addReviewAssignmentClarification,
  parseReviewAssignmentListQuery,
  parseReviewAssignmentCreate,
  parseAssignmentId,
  parseAssignmentDecline,
  parseAssignmentAnnotation,
  parseAssignmentClarification,
  type ReviewAssignmentDeps,
  type ListAssignmentsResult,
  type GetAssignmentResult,
  type CreateAssignmentResult,
  type AcceptAssignmentResult,
  type RawReviewAssignmentListQuery,
  type AssignmentAnnotationRecord,
  type AssignmentClarificationRecord,
} from '@cpf/org';
import type { Actor, ReviewAssignmentCreate, ReviewAssignmentListQuery } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

type AnnotationResult =
  | { ok: true; annotation: AssignmentAnnotationRecord }
  | { ok: false; status: number; reason: string };
type ClarificationResult =
  | { ok: true; clarification: AssignmentClarificationRecord }
  | { ok: false; status: number; reason: string };

export interface ReviewAssignmentService {
  listAssignments(actor: Actor, query: ReviewAssignmentListQuery): Promise<ListAssignmentsResult>;
  getAssignment(actor: Actor, id: string): Promise<GetAssignmentResult>;
  createAssignment(actor: Actor, input: ReviewAssignmentCreate): Promise<CreateAssignmentResult>;
  acceptAssignment(actor: Actor, id: string): Promise<AcceptAssignmentResult>;
  stopAi(actor: Actor, id: string): Promise<AcceptAssignmentResult>;
  decline(actor: Actor, id: string, body: unknown): Promise<AcceptAssignmentResult>;
  addAnnotation(actor: Actor, id: string, body: unknown): Promise<AnnotationResult>;
  addClarification(actor: Actor, id: string, body: unknown): Promise<ClarificationResult>;
}

export function createReviewAssignmentService(deps: ReviewAssignmentDeps): ReviewAssignmentService {
  return {
    listAssignments: (actor, q) => listReviewAssignments(deps, actor, q),
    getAssignment: (actor, id) => getReviewAssignment(deps, actor, id),
    createAssignment: (actor, input) => createReviewAssignment(deps, actor, input),
    acceptAssignment: (actor, id) => acceptReviewAssignment(deps, actor, id),
    stopAi: (actor, id) => stopReviewAssignmentAi(deps, actor, id),
    decline: async (actor, id, body) => {
      const parsed = parseAssignmentDecline(body);
      if (!parsed.ok) return { ok: false, status: 422, reason: parsed.errors.join(', ') };
      return declineReviewAssignment(deps, actor, id, parsed.value);
    },
    addAnnotation: async (actor, id, body) => {
      const parsed = parseAssignmentAnnotation(body);
      if (!parsed.ok) return { ok: false, status: 422, reason: parsed.errors.join(', ') };
      return addReviewAssignmentAnnotation(deps, actor, id, parsed.value);
    },
    addClarification: async (actor, id, body) => {
      const parsed = parseAssignmentClarification(body);
      if (!parsed.ok) return { ok: false, status: 422, reason: parsed.errors.join(', ') };
      return addReviewAssignmentClarification(deps, actor, id, parsed.value);
    },
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

export async function handlePostStopAssignmentAi(
  svc: ReviewAssignmentService,
  req: { actor: Actor; assignmentId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseAssignmentId(req.assignmentId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await svc.stopAi(req.actor, id);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.assignment, correlationId);
}

export async function handlePostDeclineAssignment(
  svc: ReviewAssignmentService,
  req: { actor: Actor; assignmentId: string; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseAssignmentId(req.assignmentId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await svc.decline(req.actor, id, req.body);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.assignment, correlationId);
}

export async function handlePostAssignmentAnnotation(
  svc: ReviewAssignmentService,
  req: { actor: Actor; assignmentId: string; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseAssignmentId(req.assignmentId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await svc.addAnnotation(req.actor, id, req.body);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(201, result.annotation, correlationId);
}

export async function handlePostAssignmentClarification(
  svc: ReviewAssignmentService,
  req: { actor: Actor; assignmentId: string; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseAssignmentId(req.assignmentId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await svc.addClarification(req.actor, id, req.body);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(201, result.clarification, correlationId);
}
