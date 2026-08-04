import {
  parsePreferenceQuery,
  parsePreferenceUpdate,
  type Actor,
  type ListPreferencesResult,
  type NotificationPreferenceListQuery,
  type NotificationPreferencePageDto,
  type NotificationPreferenceUpdate,
  type RawPreferenceQuery,
  type UpdatePreferencesResult,
} from '@cpf/account';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

/** Service seam so the handlers can be tested without a database. */
export interface NotificationPreferencesService {
  listPreferences(
    actor: Actor,
    query: NotificationPreferenceListQuery,
  ): Promise<ListPreferencesResult>;
  updatePreferences(
    actor: Actor,
    update: NotificationPreferenceUpdate,
  ): Promise<UpdatePreferencesResult>;
}

export interface GetNotificationPreferencesRequest {
  readonly actor: Actor;
  readonly query: RawPreferenceQuery;
  readonly correlationId?: string;
}

export interface PutNotificationPreferencesRequest {
  readonly actor: Actor;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type NotificationPreferencesResponse =
  HttpResponse<NotificationPreferencePageDto> | HttpResponse<ProblemDetails>;

/** HTTP boundary for `get_me_notification_preferences`: 422 on bad paging, else 200 page. */
export async function handleGetMeNotificationPreferences(
  service: NotificationPreferencesService,
  req: GetNotificationPreferencesRequest,
): Promise<NotificationPreferencesResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parsePreferenceQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.listPreferences(req.actor, parsed.value);
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

/** HTTP boundary for `put_me_notification_preferences`: 422 on bad body, else 200 refreshed page. */
export async function handlePutMeNotificationPreferences(
  service: NotificationPreferencesService,
  req: PutNotificationPreferencesRequest,
): Promise<NotificationPreferencesResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parsePreferenceUpdate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.updatePreferences(req.actor, parsed.value);
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
