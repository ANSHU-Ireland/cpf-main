import {
  listCampaignReviewers,
  addCampaignReviewer,
  deactivateCampaignReviewer,
  updateCampaignReviewer,
  parseReviewerListQuery,
  parseReviewerCreate,
  parseReviewerUpdate,
  parseReviewerId,
  parseCampaignIdParam,
  type CampaignReviewerDeps,
  type ListReviewersResult,
  type AddReviewerResult,
  type DeactivateReviewerResult,
  type UpdateReviewerResult,
  type RawReviewerListQuery,
} from '@cpf/org';
import type {
  Actor,
  CampaignReviewerCreate,
  CampaignReviewerDto,
  CampaignReviewerListQuery,
  CampaignReviewerPageDto,
  CampaignReviewerUpdate,
} from '@cpf/org';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

export interface CampaignReviewerService {
  listReviewers(
    actor: Actor,
    campaignId: string,
    query: CampaignReviewerListQuery,
  ): Promise<ListReviewersResult>;
  addReviewer(
    actor: Actor,
    campaignId: string,
    input: CampaignReviewerCreate,
  ): Promise<AddReviewerResult>;
  deactivateReviewer(
    actor: Actor,
    campaignId: string,
    reviewerId: string,
  ): Promise<DeactivateReviewerResult>;
  updateReviewer(
    actor: Actor,
    campaignId: string,
    reviewerId: string,
    input: CampaignReviewerUpdate,
  ): Promise<UpdateReviewerResult>;
}

export function createCampaignReviewerService(deps: CampaignReviewerDeps): CampaignReviewerService {
  return {
    listReviewers: (actor, campaignId, query) =>
      listCampaignReviewers(deps, actor, campaignId, query),
    addReviewer: (actor, campaignId, input) => addCampaignReviewer(deps, actor, campaignId, input),
    deactivateReviewer: (actor, campaignId, reviewerId) =>
      deactivateCampaignReviewer(deps, actor, campaignId, reviewerId),
    updateReviewer: (actor, campaignId, reviewerId, input) =>
      updateCampaignReviewer(deps, actor, campaignId, reviewerId, input),
  };
}

export interface GetReviewersRequest {
  readonly actor: Actor;
  readonly campaignId: string;
  readonly query: RawReviewerListQuery;
  readonly correlationId?: string;
}

export interface PostReviewerRequest {
  readonly actor: Actor;
  readonly campaignId: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export interface DeleteReviewerRequest {
  readonly actor: Actor;
  readonly campaignId: string;
  readonly reviewerId: string;
  readonly correlationId?: string;
}

export interface PatchReviewerRequest {
  readonly actor: Actor;
  readonly campaignId: string;
  readonly reviewerId: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type ReviewerListResponse =
  HttpResponse<CampaignReviewerPageDto> | HttpResponse<ProblemDetails>;
export type ReviewerResponse = HttpResponse<CampaignReviewerDto> | HttpResponse<ProblemDetails>;

export async function handleGetCampaignReviewers(
  service: CampaignReviewerService,
  req: GetReviewersRequest,
): Promise<ReviewerListResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const cid = parseCampaignIdParam(req.campaignId);
  if (cid === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'campaignId must be a valid UUID.',
    });
  }

  const parsed = parseReviewerListQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.listReviewers(req.actor, cid, parsed.value);
  if (result.ok) return jsonResponse(200, result.page, correlationId);
  return problemResponse({ status: 403, title: 'Forbidden', correlationId, detail: result.reason });
}

export async function handlePostCampaignReviewer(
  service: CampaignReviewerService,
  req: PostReviewerRequest,
): Promise<ReviewerResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const cid = parseCampaignIdParam(req.campaignId);
  if (cid === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'campaignId must be a valid UUID.',
    });
  }

  const parsed = parseReviewerCreate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.addReviewer(req.actor, cid, parsed.value);
  if (result.ok) return jsonResponse(200, result.reviewer, correlationId);
  if (result.status === 409) {
    return problemResponse({
      status: 409,
      title: 'Conflict',
      correlationId,
      detail: result.reason,
    });
  }
  return problemResponse({ status: 403, title: 'Forbidden', correlationId, detail: result.reason });
}

export async function handleDeleteCampaignReviewer(
  service: CampaignReviewerService,
  req: DeleteReviewerRequest,
): Promise<ReviewerResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const cid = parseCampaignIdParam(req.campaignId);
  if (cid === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'campaignId must be a valid UUID.',
    });
  }

  const rid = parseReviewerId(req.reviewerId);
  if (rid === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'reviewerId must be a valid UUID.',
    });
  }

  const result = await service.deactivateReviewer(req.actor, cid, rid);
  if (result.ok) return jsonResponse(200, result.reviewer, correlationId);
  if (result.status === 404) {
    return problemResponse({
      status: 404,
      title: 'Not Found',
      correlationId,
      detail: result.reason,
    });
  }
  return problemResponse({ status: 403, title: 'Forbidden', correlationId, detail: result.reason });
}

export async function handlePatchCampaignReviewer(
  service: CampaignReviewerService,
  req: PatchReviewerRequest,
): Promise<ReviewerResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const cid = parseCampaignIdParam(req.campaignId);
  if (cid === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'campaignId must be a valid UUID.',
    });
  }

  const rid = parseReviewerId(req.reviewerId);
  if (rid === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'reviewerId must be a valid UUID.',
    });
  }

  const parsed = parseReviewerUpdate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.updateReviewer(req.actor, cid, rid, parsed.value);
  if (result.ok) return jsonResponse(200, result.reviewer, correlationId);
  if (result.status === 404) {
    return problemResponse({
      status: 404,
      title: 'Not Found',
      correlationId,
      detail: result.reason,
    });
  }
  return problemResponse({ status: 403, title: 'Forbidden', correlationId, detail: result.reason });
}
