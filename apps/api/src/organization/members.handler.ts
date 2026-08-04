import {
  parseMemberListQuery,
  type Actor,
  type ListMembersResult,
  type MemberListQuery,
  type MemberPageDto,
  type RawMemberListQuery,
} from '@cpf/org';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

export interface MemberService {
  listMembers(actor: Actor, query: MemberListQuery): Promise<ListMembersResult>;
}

export interface GetOrganizationMembersRequest {
  readonly actor: Actor;
  readonly query: RawMemberListQuery;
  readonly correlationId?: string;
}

export type MemberListResponse = HttpResponse<MemberPageDto> | HttpResponse<ProblemDetails>;

/** HTTP boundary for `get_organization_members`: 422 on bad query, else 200 page / 403. */
export async function handleGetOrganizationMembers(
  service: MemberService,
  req: GetOrganizationMembersRequest,
): Promise<MemberListResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseMemberListQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.listMembers(req.actor, parsed.value);
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
