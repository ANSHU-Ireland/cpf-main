import { can } from '@cpf/policy';
import { ADMIN_PERMISSIONS } from './admin-permissions.js';
import type { Actor } from './types.js';

export interface ReleaseRecord {
  readonly id: string;
  readonly version: string;
  readonly channel: string;
  readonly notes: string;
  readonly releasedAt: string;
}

export interface ReleaseRepository {
  listReleases(actor: Actor): Promise<{ items: readonly ReleaseRecord[]; total: number }>;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listReleases(
  deps: { repository: ReleaseRepository },
  actor: Actor,
): Promise<Result<{ items: readonly ReleaseRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles, isPlatformStaff: true },
    'read',
    { type: 'platform_release', tenantId: actor.tenantId },
    ADMIN_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  return { ok: true, ...(await deps.repository.listReleases(actor)) };
}
