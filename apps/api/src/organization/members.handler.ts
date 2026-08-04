import {
  parseMemberId,
  parseMemberListQuery,
  parseMemberRolesUpdate,
  parseMemberStatusUpdate,
  type Actor,
  type ListMembersResult,
  type MemberDto,
  type MemberListQuery,
  type MemberPageDto,
  type MemberRolesUpdate,
  type MemberStatusUpdate,
  type RawMemberListQuery,
  type ReplaceMemberRolesResult,
  type UpdateMemberStatusResult,
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
  updateMemberStatus(
    actor: Actor,
    memberId: string,
    input: MemberStatusUpdate,
  ): Promise<UpdateMemberStatusResult>;
  replaceMemberRoles(
    actor: Actor,
    memberId: string,
    input: MemberRolesUpdate,
  ): Promise<ReplaceMemberRolesResult>;
}

export interface GetOrganizationMembersRequest {
  readonly actor: Actor;
  readonly query: RawMemberListQuery;
  readonly correlationId?: string;
}

export type MemberListResponse = HttpResponse<MemberPageDto> | HttpResponse<ProblemDetails>;
export type MemberResponse = HttpResponse<MemberDto> | HttpResponse<ProblemDetails>;

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

export interface PutMemberStatusRequest {
  readonly actor: Actor;
  readonly memberId: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export async function handlePutOrganizationMemberStatus(
  service: MemberService,
  req: PutMemberStatusRequest,
): Promise<MemberResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const id = parseMemberId(req.memberId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'memberId must be a valid UUID.',
    });
  }

  const parsed = parseMemberStatusUpdate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.updateMemberStatus(req.actor, id, parsed.value);
  if (result.ok) return jsonResponse(200, result.member, correlationId);
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

export interface PutMemberRolesRequest {
  readonly actor: Actor;
  readonly memberId: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export async function handlePutOrganizationMemberRoles(
  service: MemberService,
  req: PutMemberRolesRequest,
): Promise<MemberResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const id = parseMemberId(req.memberId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'memberId must be a valid UUID.',
    });
  }

  const parsed = parseMemberRolesUpdate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.replaceMemberRoles(req.actor, id, parsed.value);
  if (result.ok) return jsonResponse(200, result.member, correlationId);
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
