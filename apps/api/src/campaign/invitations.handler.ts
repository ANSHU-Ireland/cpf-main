import {
  listInvitations,
  getInvitation,
  createInvitation,
  revokeInvitation,
  parseInvitationListQuery,
  parseInvitationCreate,
  parseInvitationId,
  parseApplicationIdParam,
  resendInvitation,
  extendInvitation,
  parseInvitationExtend,
  type InvitationDeps,
  type ListInvitationsResult,
  type GetInvitationResult,
  type CreateInvitationResult,
  type RevokeInvitationResult,
  type ResendInvitationResult,
  type ExtendInvitationResult,
  type RawInvitationListQuery,
} from '@cpf/org';
import type {
  Actor,
  InvitationCreate,
  InvitationDto,
  InvitationListQuery,
  InvitationPageDto,
} from '@cpf/org';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

export interface InvitationService {
  listInvitations(
    actor: Actor,
    applicationId: string,
    query: InvitationListQuery,
  ): Promise<ListInvitationsResult>;
  getInvitation(actor: Actor, id: string): Promise<GetInvitationResult>;
  createInvitation(
    actor: Actor,
    applicationId: string,
    input: InvitationCreate,
  ): Promise<CreateInvitationResult>;
  revokeInvitation(actor: Actor, id: string): Promise<RevokeInvitationResult>;
  resendInvitation(actor: Actor, id: string): Promise<ResendInvitationResult>;
  extendInvitation(actor: Actor, id: string, expiresAt: string): Promise<ExtendInvitationResult>;
}

export function createInvitationService(deps: InvitationDeps): InvitationService {
  return {
    listInvitations: (actor, applicationId, query) =>
      listInvitations(deps, actor, applicationId, query),
    getInvitation: (actor, id) => getInvitation(deps, actor, id),
    createInvitation: (actor, applicationId, input) =>
      createInvitation(deps, actor, applicationId, input),
    revokeInvitation: (actor, id) => revokeInvitation(deps, actor, id),
    resendInvitation: (actor, id) => resendInvitation(deps, actor, id),
    extendInvitation: (actor, id, expiresAt) => extendInvitation(deps, actor, id, expiresAt),
  };
}

export interface GetInvitationsRequest {
  readonly actor: Actor;
  readonly applicationId: string;
  readonly query: RawInvitationListQuery;
  readonly correlationId?: string;
}

export interface GetInvitationRequest {
  readonly actor: Actor;
  readonly invitationId: string;
  readonly correlationId?: string;
}

export interface PostInvitationRequest {
  readonly actor: Actor;
  readonly applicationId: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export interface RevokeInvitationRequest {
  readonly actor: Actor;
  readonly invitationId: string;
  readonly correlationId?: string;
}

export type InvitationListResponse = HttpResponse<InvitationPageDto> | HttpResponse<ProblemDetails>;
export type InvitationResponse = HttpResponse<InvitationDto> | HttpResponse<ProblemDetails>;

export async function handleGetInvitations(
  service: InvitationService,
  req: GetInvitationsRequest,
): Promise<InvitationListResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const appId = parseApplicationIdParam(req.applicationId);
  if (appId === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'applicationId must be a valid UUID.',
    });
  }
  const parsed = parseInvitationListQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }
  const result = await service.listInvitations(req.actor, appId, parsed.value);
  if (result.ok) return jsonResponse(200, result.page, correlationId);
  return problemResponse({
    status: 403,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}

export async function handleGetInvitation(
  service: InvitationService,
  req: GetInvitationRequest,
): Promise<InvitationResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const id = parseInvitationId(req.invitationId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'invitationId must be a valid UUID.',
    });
  }
  const result = await service.getInvitation(req.actor, id);
  if (result.ok) return jsonResponse(200, result.invitation, correlationId);
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

export async function handlePostInvitation(
  service: InvitationService,
  req: PostInvitationRequest,
): Promise<InvitationResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const appId = parseApplicationIdParam(req.applicationId);
  if (appId === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'applicationId must be a valid UUID.',
    });
  }
  const parsed = parseInvitationCreate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }
  const result = await service.createInvitation(req.actor, appId, parsed.value);
  if (result.ok) return jsonResponse(200, result.invitation, correlationId);
  return problemResponse({
    status: 403,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}

export async function handleRevokeInvitation(
  service: InvitationService,
  req: RevokeInvitationRequest,
): Promise<InvitationResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const id = parseInvitationId(req.invitationId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'invitationId must be a valid UUID.',
    });
  }
  const result = await service.revokeInvitation(req.actor, id);
  if (result.ok) return jsonResponse(200, result.invitation, correlationId);
  if (result.status === 404) {
    return problemResponse({
      status: 404,
      title: 'Not Found',
      correlationId,
      detail: result.reason,
    });
  }
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

export async function handleResendInvitation(
  service: InvitationService,
  req: RevokeInvitationRequest,
): Promise<InvitationResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const id = parseInvitationId(req.invitationId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'invitationId must be a valid UUID.',
    });
  }
  const result = await service.resendInvitation(req.actor, id);
  if (result.ok) return jsonResponse(200, result.invitation, correlationId);
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

export async function handleExtendInvitation(
  service: InvitationService,
  req: PostInvitationRequest & { readonly invitationId: string },
): Promise<InvitationResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const id = parseInvitationId(req.invitationId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'invitationId must be a valid UUID.',
    });
  }
  const parsed = parseInvitationExtend(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }
  const result = await service.extendInvitation(req.actor, id, parsed.value.expiresAt);
  if (result.ok) return jsonResponse(200, result.invitation, correlationId);
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
