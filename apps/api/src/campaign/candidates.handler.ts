import {
  listCandidates,
  getCandidate,
  createCandidate,
  parseCandidateListQuery,
  parseCandidateCreate,
  parseCandidateId,
  type CandidateDeps,
  type ListCandidatesResult,
  type GetCandidateResult,
  type CreateCandidateResult,
  type RawCandidateListQuery,
} from '@cpf/org';
import type {
  Actor,
  CandidateCreate,
  CandidateDto,
  CandidateListQuery,
  CandidatePageDto,
} from '@cpf/org';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

export interface CandidateService {
  listCandidates(actor: Actor, query: CandidateListQuery): Promise<ListCandidatesResult>;
  getCandidate(actor: Actor, id: string): Promise<GetCandidateResult>;
  createCandidate(actor: Actor, input: CandidateCreate): Promise<CreateCandidateResult>;
}

export function createCandidateService(deps: CandidateDeps): CandidateService {
  return {
    listCandidates: (actor, query) => listCandidates(deps, actor, query),
    getCandidate: (actor, id) => getCandidate(deps, actor, id),
    createCandidate: (actor, input) => createCandidate(deps, actor, input),
  };
}

export interface GetCandidatesRequest {
  readonly actor: Actor;
  readonly query: RawCandidateListQuery;
  readonly correlationId?: string;
}

export interface GetCandidateRequest {
  readonly actor: Actor;
  readonly candidateId: string;
  readonly correlationId?: string;
}

export interface PostCandidateRequest {
  readonly actor: Actor;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type CandidateListResponse = HttpResponse<CandidatePageDto> | HttpResponse<ProblemDetails>;
export type CandidateResponse = HttpResponse<CandidateDto> | HttpResponse<ProblemDetails>;

export async function handleGetCandidates(
  service: CandidateService,
  req: GetCandidatesRequest,
): Promise<CandidateListResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const parsed = parseCandidateListQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }
  const result = await service.listCandidates(req.actor, parsed.value);
  if (result.ok) return jsonResponse(200, result.page, correlationId);
  return problemResponse({
    status: 403,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}

export async function handleGetCandidate(
  service: CandidateService,
  req: GetCandidateRequest,
): Promise<CandidateResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const id = parseCandidateId(req.candidateId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'candidateId must be a valid UUID.',
    });
  }
  const result = await service.getCandidate(req.actor, id);
  if (result.ok) return jsonResponse(200, result.candidate, correlationId);
  if (result.status === 404) {
    return problemResponse({
      status: 404,
      title: 'Not Found',
      correlationId,
      detail: result.reason,
    });
  }
  return problemResponse({
    status: 403,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}

export async function handlePostCandidate(
  service: CandidateService,
  req: PostCandidateRequest,
): Promise<CandidateResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const parsed = parseCandidateCreate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }
  const result = await service.createCandidate(req.actor, parsed.value);
  if (result.ok) return jsonResponse(200, result.candidate, correlationId);
  if (result.status === 409) {
    return problemResponse({
      status: 409,
      title: 'Conflict',
      correlationId,
      detail: result.reason,
    });
  }
  return problemResponse({
    status: 403,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}
