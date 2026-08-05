import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface MemberInvitationRecord {
  readonly id: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly status: string;
  readonly createdAt: string;
}

export interface MemberInvitationCreate {
  readonly email: string;
  readonly roles: readonly string[];
}

export interface MemberInvitationRepository {
  createInvitation(actor: Actor, input: MemberInvitationCreate): Promise<MemberInvitationRecord>;
  resendInvitation(actor: Actor, id: string): Promise<MemberInvitationRecord | null>;
  revokeInvitation(actor: Actor, id: string): Promise<boolean>;
}

export function parseMemberInvitationCreate(
  raw: unknown,
): { ok: true; value: MemberInvitationCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['email'] !== 'string' || !EMAIL_RE.test(obj['email']))
    errors.push('valid email required');
  if (!Array.isArray(obj['roles']) || obj['roles'].length === 0)
    errors.push('roles must be a non-empty array');
  else if (!obj['roles'].every((r) => typeof r === 'string')) errors.push('roles must be strings');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { email: obj['email'] as string, roles: obj['roles'] as string[] } };
}

export function parseMemberInvitationId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function createMemberInvitation(
  deps: { repository: MemberInvitationRepository },
  actor: Actor,
  input: MemberInvitationCreate,
): Promise<Result<{ invitation: MemberInvitationRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'organization_member', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createInvitation(actor, input);
  return { ok: true, invitation: r };
}

export async function resendMemberInvitation(
  deps: { repository: MemberInvitationRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ invitation: MemberInvitationRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'organization_member', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.resendInvitation(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, invitation: r };
}

export async function revokeMemberInvitation(
  deps: { repository: MemberInvitationRepository },
  actor: Actor,
  id: string,
): Promise<Result<Record<string, never>>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'organization_member', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const removed = await deps.repository.revokeInvitation(actor, id);
  if (!removed) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true } as Result<Record<string, never>>;
}
