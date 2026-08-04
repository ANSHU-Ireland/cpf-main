import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const RISK_CONTROL_STATUSES = [
  'open',
  'mitigating',
  'accepted',
  'closed',
  'overdue',
] as const;
export type RiskControlStatus = (typeof RISK_CONTROL_STATUSES)[number];

export interface RiskControlRecord {
  readonly id: string;
  readonly riskCode: string;
  readonly harm: string;
  readonly controlDescription: string;
  readonly status: RiskControlStatus;
  readonly createdAt: string;
}

export interface RiskControlCreate {
  readonly riskCode: string;
  readonly harm: string;
  readonly cause: string;
  readonly controlDescription: string;
  readonly testReference: string;
  readonly inherentLikelihood: number;
  readonly inherentSeverity: number;
}

export interface RiskControlRepository {
  listControls(actor: Actor): Promise<{ items: readonly RiskControlRecord[]; total: number }>;
  getControl(actor: Actor, id: string): Promise<RiskControlRecord | null>;
  createControl(actor: Actor, input: RiskControlCreate): Promise<RiskControlRecord>;
}

export function parseRiskControlCreate(
  raw: unknown,
): { ok: true; value: RiskControlCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  for (const k of ['riskCode', 'harm', 'cause', 'controlDescription', 'testReference'] as const) {
    if (typeof obj[k] !== 'string' || (obj[k] as string).length === 0) errors.push(`${k} required`);
  }
  for (const k of ['inherentLikelihood', 'inherentSeverity'] as const) {
    const v = obj[k];
    if (typeof v !== 'number' || v < 1 || v > 5) errors.push(`${k} must be 1-5`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: obj as unknown as RiskControlCreate };
}

export function parseRiskControlId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listRiskControls(
  deps: { repository: RiskControlRepository },
  actor: Actor,
): Promise<Result<{ items: readonly RiskControlRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'risk_control', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.listControls(actor);
  return { ok: true, items: r.items, total: r.total };
}

export async function getRiskControl(
  deps: { repository: RiskControlRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ control: RiskControlRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'risk_control', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.getControl(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, control: r };
}

export async function createRiskControl(
  deps: { repository: RiskControlRepository },
  actor: Actor,
  input: RiskControlCreate,
): Promise<Result<{ control: RiskControlRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'risk_control', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createControl(actor, input);
  return { ok: true, control: r };
}
