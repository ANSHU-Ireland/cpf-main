import {
  parseProfileUpdate,
  type Actor,
  type ProfileUpdate,
  type UpdateMeResult,
  type UserProfileDto,
} from '@cpf/account';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

/** Service seam so the handler can be tested without a database. */
export interface PatchMeService {
  updateMe(actor: Actor, patch: ProfileUpdate): Promise<UpdateMeResult>;
}

export interface PatchMeRequest {
  readonly actor: Actor;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type PatchMeResponse = HttpResponse<UserProfileDto> | HttpResponse<ProblemDetails>;

const PROBLEM_TITLES: Record<403 | 404, string> = {
  403: 'Forbidden',
  404: 'Not Found',
};

/**
 * HTTP boundary for OpenAPI `patch_me`: validates the body into a `ProfileUpdate`, returning
 * 422 problem+json on invalid input, else maps the audited use-case result to 200 or an error.
 */
export async function handlePatchMe(
  service: PatchMeService,
  req: PatchMeRequest,
): Promise<PatchMeResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

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

  const result = await service.updateMe(req.actor, parsed.value);
  if (result.ok) {
    return jsonResponse(200, result.profile, correlationId);
  }

  return problemResponse({
    status: result.status,
    title: PROBLEM_TITLES[result.status],
    correlationId,
    detail: result.reason,
  });
}
