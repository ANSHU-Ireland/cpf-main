import {
  parseTeamCreate,
  parseTeamId,
  parseTeamListQuery,
  parseTeamUpdate,
  type Actor,
  type CreateTeamResult,
  type TeamCreate,
  type TeamDto,
  type TeamListQuery,
  type TeamPageDto,
  type TeamUpdate,
  type ListTeamsResult,
  type RawTeamListQuery,
  type UpdateTeamResult,
} from '@cpf/org';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

export interface TeamService {
  listTeams(actor: Actor, query: TeamListQuery): Promise<ListTeamsResult>;
  createTeam(actor: Actor, input: TeamCreate): Promise<CreateTeamResult>;
  updateTeam(actor: Actor, id: string, input: TeamUpdate): Promise<UpdateTeamResult>;
}

export interface GetTeamsRequest {
  readonly actor: Actor;
  readonly query: RawTeamListQuery;
  readonly correlationId?: string;
}

export interface PostTeamRequest {
  readonly actor: Actor;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type TeamListResponse = HttpResponse<TeamPageDto> | HttpResponse<ProblemDetails>;
export type TeamResponse = HttpResponse<TeamDto> | HttpResponse<ProblemDetails>;

export async function handleGetOrganizationTeams(
  service: TeamService,
  req: GetTeamsRequest,
): Promise<TeamListResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseTeamListQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.listTeams(req.actor, parsed.value);
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

export async function handlePostOrganizationTeam(
  service: TeamService,
  req: PostTeamRequest,
): Promise<TeamResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseTeamCreate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.createTeam(req.actor, parsed.value);
  if (result.ok) {
    return jsonResponse(200, result.team, correlationId);
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
    status: result.status,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}

export interface PatchTeamRequest {
  readonly actor: Actor;
  readonly teamId: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export async function handlePatchOrganizationTeam(
  service: TeamService,
  req: PatchTeamRequest,
): Promise<TeamResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const id = parseTeamId(req.teamId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'teamId must be a valid UUID.',
    });
  }

  const parsed = parseTeamUpdate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.updateTeam(req.actor, id, parsed.value);
  if (result.ok) {
    return jsonResponse(200, result.team, correlationId);
  }
  if (result.status === 409) {
    return problemResponse({
      status: 409,
      title: 'Conflict',
      correlationId,
      detail: result.reason,
    });
  }
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
