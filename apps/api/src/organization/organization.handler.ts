import {
  parseOrganizationQuery,
  type Actor,
  type GetOrganizationResult,
  type OrganizationDto,
  type RawOrganizationQuery,
} from '@cpf/org';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

/** Service seam so the handler can be tested without a database. */
export interface OrganizationService {
  getOrganization(actor: Actor): Promise<GetOrganizationResult>;
}

export interface GetOrganizationRequest {
  readonly actor: Actor;
  readonly query: RawOrganizationQuery;
  readonly correlationId?: string;
}

export type OrganizationResponse = HttpResponse<OrganizationDto> | HttpResponse<ProblemDetails>;

/** HTTP boundary for `get_organization`: 422 on bad query, else 200 organisation / 403 / 404. */
export async function handleGetOrganization(
  service: OrganizationService,
  req: GetOrganizationRequest,
): Promise<OrganizationResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseOrganizationQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.getOrganization(req.actor);
  if (result.ok) {
    return jsonResponse(200, result.organization, correlationId);
  }
  if (result.status === 404) {
    return problemResponse({
      status: 404,
      title: 'Not Found',
      correlationId,
      detail: 'No organisation exists for the caller.',
    });
  }
  return problemResponse({
    status: result.status,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}
