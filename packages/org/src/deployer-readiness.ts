import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

export interface DeployerReadinessRecord {
  readonly tenantId: string;
  readonly humanOversightConfirmed: boolean;
  readonly monitoringConfirmed: boolean;
  readonly recordKeepingConfirmed: boolean;
  readonly status: string;
  readonly updatedAt: string;
}

export interface DeployerReadinessUpdate {
  readonly humanOversightConfirmed: boolean;
  readonly monitoringConfirmed: boolean;
  readonly recordKeepingConfirmed: boolean;
}

export interface DeployerReadinessRepository {
  getReadiness(actor: Actor): Promise<DeployerReadinessRecord | null>;
  updateReadiness(actor: Actor, input: DeployerReadinessUpdate): Promise<DeployerReadinessRecord>;
}

export function parseDeployerReadinessUpdate(
  raw: unknown,
): { ok: true; value: DeployerReadinessUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  for (const k of [
    'humanOversightConfirmed',
    'monitoringConfirmed',
    'recordKeepingConfirmed',
  ] as const) {
    if (typeof obj[k] !== 'boolean') errors.push(`${k} must be boolean`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      humanOversightConfirmed: obj['humanOversightConfirmed'] as boolean,
      monitoringConfirmed: obj['monitoringConfirmed'] as boolean,
      recordKeepingConfirmed: obj['recordKeepingConfirmed'] as boolean,
    },
  };
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function getDeployerReadiness(
  deps: { repository: DeployerReadinessRepository },
  actor: Actor,
): Promise<Result<{ readiness: DeployerReadinessRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'deployer_readiness', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.getReadiness(actor);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, readiness: r };
}

export async function updateDeployerReadiness(
  deps: { repository: DeployerReadinessRepository },
  actor: Actor,
  input: DeployerReadinessUpdate,
): Promise<Result<{ readiness: DeployerReadinessRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'deployer_readiness', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.updateReadiness(actor, input);
  return { ok: true, readiness: r };
}
