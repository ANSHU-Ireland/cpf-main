import type { Actor, GetMeResult, UserProfileDto } from '@cpf/account';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

/** Service seam so the handler can be tested without a database. */
export interface AccountService {
  getMe(actor: Actor): Promise<GetMeResult>;
}

export interface GetMeRequest {
  readonly actor: Actor;
  readonly correlationId?: string;
}

export type GetMeResponse = HttpResponse<UserProfileDto> | HttpResponse<ProblemDetails>;

const PROBLEM_TITLES: Record<403 | 404, string> = {
  403: 'Forbidden',
  404: 'Not Found',
};

/**
 * HTTP boundary for OpenAPI `get_me`: maps the use-case result to 200 `UserProfile` or a
 * problem+json error, always echoing `X-Correlation-ID`.
 */
export async function handleGetMe(
  service: AccountService,
  req: GetMeRequest,
): Promise<GetMeResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const result = await service.getMe(req.actor);

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
