import {
  parsePreferencesUpdate,
  type Actor,
  type GetPreferencesResult,
  type PreferencesUpdate,
  type ReplacePreferencesResult,
  type UserPreferencesDto,
} from '@cpf/account';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

/** Service seam so the handlers can be tested without a database. */
export interface PreferencesService {
  getPreferences(actor: Actor): Promise<GetPreferencesResult>;
  replacePreferences(actor: Actor, update: PreferencesUpdate): Promise<ReplacePreferencesResult>;
}

export interface GetPreferencesRequest {
  readonly actor: Actor;
  readonly correlationId?: string;
}

export interface PutPreferencesRequest {
  readonly actor: Actor;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type PreferencesResponse = HttpResponse<UserPreferencesDto> | HttpResponse<ProblemDetails>;

/** HTTP boundary for `get_me_preferences`: 200 preferences, else 403/404 problem+json. */
export async function handleGetMePreferences(
  service: PreferencesService,
  req: GetPreferencesRequest,
): Promise<PreferencesResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const result = await service.getPreferences(req.actor);
  if (result.ok) {
    return jsonResponse(200, result.preferences, correlationId);
  }
  return problemResponse({
    status: result.status,
    title: result.status === 404 ? 'Not Found' : 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}

/** HTTP boundary for `put_me_preferences`: 422 on bad body, else 200 stored view / 403. */
export async function handlePutMePreferences(
  service: PreferencesService,
  req: PutPreferencesRequest,
): Promise<PreferencesResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parsePreferencesUpdate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.replacePreferences(req.actor, parsed.value);
  if (result.ok) {
    return jsonResponse(200, result.preferences, correlationId);
  }
  return problemResponse({
    status: result.status,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}
