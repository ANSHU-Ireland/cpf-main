import { can } from '@cpf/policy';
import type { Actor } from './types.js';
import { ORG_PERMISSIONS } from './permissions.js';
import { NOTICE_TYPES } from './notice-types.js';
import type { NoticeCreate, NoticeType } from './notice-types.js';
import type { NoticeRepository } from './notice-repository.js';

// --- parsers ---

const VALID_TYPES: ReadonlySet<string> = new Set(NOTICE_TYPES);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseNoticeCreate(
  raw: unknown,
): { ok: true; value: NoticeCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body must be object'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['noticeType'] !== 'string' || !VALID_TYPES.has(obj['noticeType'])) {
    errors.push('noticeType must be one of: ' + NOTICE_TYPES.join(', '));
  }
  if (typeof obj['noticeVersion'] !== 'string' || obj['noticeVersion'].length === 0) {
    errors.push('noticeVersion is required');
  } else if (typeof obj['noticeVersion'] === 'string' && obj['noticeVersion'].length > 50) {
    errors.push('noticeVersion too long');
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { noticeType: obj['noticeType'] as NoticeType, noticeVersion: obj['noticeVersion'] as string } };
}

export function parseNoticeApplicationId(id: string): string | null {
  return UUID_RE.test(id) ? id : null;
}

// --- domain logic ---

interface NoticeDeps {
  readonly repository: NoticeRepository;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listNotices(
  deps: NoticeDeps,
  actor: Actor,
  applicationId: string,
): Promise<Result<{ items: readonly unknown[]; total: number }>> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'notice_acknowledgement', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const result = await deps.repository.listNotices(actor, applicationId);
  return { ok: true, items: result.items, total: result.total };
}

export async function createNotice(
  deps: NoticeDeps,
  actor: Actor,
  applicationId: string,
  input: NoticeCreate,
): Promise<Result<{ notice: unknown }>> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'notice_acknowledgement', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.createNotice(actor, applicationId, input);
  return { ok: true, notice: record };
}
