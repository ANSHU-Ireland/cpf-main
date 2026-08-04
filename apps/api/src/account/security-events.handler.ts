import {
  parseSecurityEventQuery,
  type Actor,
  type ListSecurityEventsResult,
  type RawSecurityEventQuery,
  type SecurityEventListQuery,
  type SecurityEventPageDto,
} from '@cpf/account';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

/** Service seam so the handler can be tested without a database. */
export interface SecurityEventsService {
  listSecurityEvents(
    actor: Actor,
    query: SecurityEventListQuery,
  ): Promise<ListSecurityEventsResult>;
}

export interface SecurityEventsRequest {
  readonly actor: Actor;
  readonly query: RawSecurityEventQuery;
  readonly correlationId?: string;
}

export type SecurityEventsResponse =
  HttpResponse<SecurityEventPageDto> | HttpResponse<ProblemDetails>;

/** HTTP boundary for `get_me_security_events`: validates paging, then maps to 200 `SecurityEventPage`. */
export async function handleGetMeSecurityEvents(
  service: SecurityEventsService,
  req: SecurityEventsRequest,
): Promise<SecurityEventsResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseSecurityEventQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.listSecurityEvents(req.actor, parsed.value);
  if (result.ok) {
    return jsonResponse(200, result.page, correlationId);
  }
  return problemResponse({
    status: result.status,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}
