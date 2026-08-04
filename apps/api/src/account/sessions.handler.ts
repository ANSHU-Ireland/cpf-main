import {
  parseSessionListQuery,
  type Actor,
  type ListSessionsResult,
  type RawSessionQuery,
  type RevokeSessionResult,
  type SessionListQuery,
  type SessionPageDto,
} from '@cpf/account';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

/** Service seam so the handlers can be tested without a database. */
export interface SessionsService {
  listSessions(actor: Actor, query: SessionListQuery): Promise<ListSessionsResult>;
  revokeSession(actor: Actor, sessionId: string): Promise<RevokeSessionResult>;
}

export interface ListSessionsRequest {
  readonly actor: Actor;
  readonly query: RawSessionQuery;
  readonly correlationId?: string;
}

export interface RevokeSessionRequest {
  readonly actor: Actor;
  readonly sessionId: string;
  readonly correlationId?: string;
}

export type SessionsResponse = HttpResponse<SessionPageDto> | HttpResponse<ProblemDetails>;
export type RevokeSessionResponse =
  HttpResponse<{ readonly revoked: true }> | HttpResponse<ProblemDetails>;

const PROBLEM_TITLES: Record<403 | 404, string> = {
  403: 'Forbidden',
  404: 'Not Found',
};

/** HTTP boundary for `get_me_sessions`: validates paging params, then maps to 200 `SessionPage`. */
export async function handleGetMeSessions(
  service: SessionsService,
  req: ListSessionsRequest,
): Promise<SessionsResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseSessionListQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.listSessions(req.actor, parsed.value);
  if (result.ok) {
    return jsonResponse(200, result.page, correlationId);
  }
  return problemResponse({
    status: result.status,
    title: PROBLEM_TITLES[result.status],
    correlationId,
    detail: result.reason,
  });
}

/** HTTP boundary for `delete_me_sessions_sessionId`: maps the audited revoke result to 200/403/404. */
export async function handleDeleteMeSession(
  service: SessionsService,
  req: RevokeSessionRequest,
): Promise<RevokeSessionResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const result = await service.revokeSession(req.actor, req.sessionId);

  if (result.ok) {
    return jsonResponse<{ readonly revoked: true }>(200, { revoked: true }, correlationId);
  }
  return problemResponse({
    status: result.status,
    title: PROBLEM_TITLES[result.status],
    correlationId,
    detail: result.reason,
  });
}
