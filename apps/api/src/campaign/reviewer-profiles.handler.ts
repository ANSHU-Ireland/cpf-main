import {
  listReviewerProfiles,
  createReviewerProfile,
  getReviewerProfile,
  updateReviewerProfile,
  parseProfileListQuery,
  parseProfileCreate,
  parseProfileUpdate,
  parseProfileId,
  type ReviewerProfileDeps,
  type ListProfilesResult,
  type CreateProfileResult,
  type GetProfileResult,
  type UpdateProfileResult,
  type RawReviewerProfileListQuery,
} from '@cpf/org';
import type {
  Actor,
  ReviewerProfileCreate,
  ReviewerProfileDto,
  ReviewerProfileListQuery,
  ReviewerProfilePageDto,
  ReviewerProfileUpdate,
} from '@cpf/org';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

export interface ReviewerProfileService {
  listProfiles(actor: Actor, query: ReviewerProfileListQuery): Promise<ListProfilesResult>;
  createProfile(actor: Actor, input: ReviewerProfileCreate): Promise<CreateProfileResult>;
  getProfile(actor: Actor, id: string): Promise<GetProfileResult>;
  updateProfile(
    actor: Actor,
    id: string,
    input: ReviewerProfileUpdate,
  ): Promise<UpdateProfileResult>;
}

export function createReviewerProfileService(deps: ReviewerProfileDeps): ReviewerProfileService {
  return {
    listProfiles: (actor, query) => listReviewerProfiles(deps, actor, query),
    createProfile: (actor, input) => createReviewerProfile(deps, actor, input),
    getProfile: (actor, id) => getReviewerProfile(deps, actor, id),
    updateProfile: (actor, id, input) => updateReviewerProfile(deps, actor, id, input),
  };
}

export interface GetProfilesRequest {
  readonly actor: Actor;
  readonly query: RawReviewerProfileListQuery;
  readonly correlationId?: string;
}

export interface PostProfileRequest {
  readonly actor: Actor;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type ProfileListResponse =
  HttpResponse<ReviewerProfilePageDto> | HttpResponse<ProblemDetails>;
export type ProfileResponse = HttpResponse<ReviewerProfileDto> | HttpResponse<ProblemDetails>;

export async function handleGetReviewerProfiles(
  service: ReviewerProfileService,
  req: GetProfilesRequest,
): Promise<ProfileListResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseProfileListQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.listProfiles(req.actor, parsed.value);
  if (result.ok) return jsonResponse(200, result.page, correlationId);
  return problemResponse({ status: 403, title: 'Forbidden', correlationId, detail: result.reason });
}

export async function handlePostReviewerProfile(
  service: ReviewerProfileService,
  req: PostProfileRequest,
): Promise<ProfileResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseProfileCreate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.createProfile(req.actor, parsed.value);
  if (result.ok) return jsonResponse(200, result.profile, correlationId);
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

export interface GetProfileRequest {
  readonly actor: Actor;
  readonly profileId: string;
  readonly correlationId?: string;
}

export interface PatchProfileRequest {
  readonly actor: Actor;
  readonly profileId: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export async function handleGetReviewerProfile(
  service: ReviewerProfileService,
  req: GetProfileRequest,
): Promise<ProfileResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const id = parseProfileId(req.profileId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'profileId must be a valid UUID.',
    });
  }
  const result = await service.getProfile(req.actor, id);
  if (result.ok) return jsonResponse(200, result.profile, correlationId);
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

export async function handlePatchReviewerProfile(
  service: ReviewerProfileService,
  req: PatchProfileRequest,
): Promise<ProfileResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const id = parseProfileId(req.profileId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'profileId must be a valid UUID.',
    });
  }
  const parsed = parseProfileUpdate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }
  const result = await service.updateProfile(req.actor, id, parsed.value);
  if (result.ok) return jsonResponse(200, result.profile, correlationId);
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
