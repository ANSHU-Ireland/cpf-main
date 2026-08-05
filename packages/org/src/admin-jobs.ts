import { can } from '@cpf/policy';
import { ADMIN_PERMISSIONS } from './admin-permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const JOB_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export interface JobRecord {
  readonly id: string;
  readonly type: string;
  readonly status: JobStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdminJobRepository {
  listJobs(actor: Actor): Promise<{ items: readonly JobRecord[]; total: number }>;
  cancelJob(actor: Actor, id: string): Promise<JobRecord | null>;
  retryJob(actor: Actor, id: string): Promise<JobRecord | null>;
}

export function parseJobId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor, action: 'read' | 'write'): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles, isPlatformStaff: true },
    action,
    { type: 'platform_job', tenantId: actor.tenantId },
    ADMIN_PERMISSIONS,
  ).allowed;
}

export async function listJobs(
  deps: { repository: AdminJobRepository },
  actor: Actor,
): Promise<Result<{ items: readonly JobRecord[]; total: number }>> {
  if (!authorize(actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  return { ok: true, ...(await deps.repository.listJobs(actor)) };
}

export async function cancelJob(
  deps: { repository: AdminJobRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ job: JobRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.cancelJob(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, job: r };
}

export async function retryJob(
  deps: { repository: AdminJobRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ job: JobRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.retryJob(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, job: r };
}
