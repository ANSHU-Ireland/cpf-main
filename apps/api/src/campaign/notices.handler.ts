import { listNotices, createNotice, parseNoticeCreate, parseNoticeApplicationId } from '@cpf/org';
import type { Actor, NoticeCreate } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

type ListResult =
  | { ok: true; items: readonly unknown[]; total: number }
  | { ok: false; status: number; reason: string };
type CreateResult = { ok: true; notice: unknown } | { ok: false; status: number; reason: string };

export interface NoticeService {
  listNotices(actor: Actor, applicationId: string): Promise<ListResult>;
  createNotice(actor: Actor, applicationId: string, input: NoticeCreate): Promise<CreateResult>;
}

export function createNoticeService(deps: {
  repository: Parameters<typeof listNotices>[0]['repository'];
}): NoticeService {
  return {
    listNotices: (actor, appId) => listNotices(deps, actor, appId),
    createNotice: (actor, appId, input) => createNotice(deps, actor, appId, input),
  };
}

export async function handleGetNotices(
  svc: NoticeService,
  req: { actor: Actor; applicationId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const appId = parseNoticeApplicationId(req.applicationId);
  if (appId === null)
    return problemResponse({
      status: 422,
      title: 'Invalid application ID',
      correlationId,
      detail: 'bad uuid',
    });

  const result = await svc.listNotices(req.actor, appId);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, { items: result.items, total: result.total }, correlationId);
}

export async function handlePostNotice(
  svc: NoticeService,
  req: { actor: Actor; applicationId: string; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const appId = parseNoticeApplicationId(req.applicationId);
  if (appId === null)
    return problemResponse({
      status: 422,
      title: 'Invalid application ID',
      correlationId,
      detail: 'bad uuid',
    });

  const parsed = parseNoticeCreate(req.body);
  if (!parsed.ok)
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: parsed.errors.join(', '),
    });

  const result = await svc.createNotice(req.actor, appId, parsed.value);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(201, result.notice, correlationId);
}
