import { can } from '@cpf/policy';
import type { Actor } from './types.js';
import { ORG_PERMISSIONS } from './permissions.js';
import { ACCOMMODATION_STATUSES } from './accommodation-types.js';
import type {
  AccommodationCreate,
  AccommodationStatus,
  AccommodationStatusUpdate,
} from './accommodation-types.js';
import type { AccommodationRepository } from './accommodation-repository.js';

// --- parsers ---

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES: ReadonlySet<string> = new Set(ACCOMMODATION_STATUSES);

export function parseAccommodationCreate(
  raw: unknown,
): { ok: true; value: AccommodationCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object')
    return { ok: false, errors: ['body must be object'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['requestSummary'] !== 'string' || obj['requestSummary'].length === 0) {
    errors.push('requestSummary is required');
  } else if (obj['requestSummary'].length > 2000) {
    errors.push('requestSummary too long');
  }
  if (
    obj['operationalAdjustments'] !== undefined &&
    (typeof obj['operationalAdjustments'] !== 'object' || obj['operationalAdjustments'] === null)
  ) {
    errors.push('operationalAdjustments must be object');
  }
  if (errors.length > 0) return { ok: false, errors };
  const value: AccommodationCreate = {
    requestSummary: obj['requestSummary'] as string,
  };
  if (obj['operationalAdjustments'] !== undefined) {
    return {
      ok: true,
      value: {
        ...value,
        operationalAdjustments: obj['operationalAdjustments'] as Record<string, unknown>,
      },
    };
  }
  return { ok: true, value };
}

export function parseAccommodationStatusUpdate(
  raw: unknown,
): { ok: true; value: AccommodationStatusUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object')
    return { ok: false, errors: ['body must be object'] };
  const obj = raw as Record<string, unknown>;
  if (typeof obj['status'] !== 'string' || !VALID_STATUSES.has(obj['status'])) {
    return { ok: false, errors: ['status must be one of: ' + ACCOMMODATION_STATUSES.join(', ')] };
  }
  return { ok: true, value: { status: obj['status'] as AccommodationStatus } };
}

export function parseAccommodationApplicationId(id: string): string | null {
  return UUID_RE.test(id) ? id : null;
}

export function parseAccommodationId(id: string): string | null {
  return UUID_RE.test(id) ? id : null;
}

// --- domain logic ---

interface AccommodationDeps {
  readonly repository: AccommodationRepository;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function checkRead(actor: Actor) {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'accommodation', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
}

function checkWrite(actor: Actor) {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'accommodation', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
}

export async function listAccommodations(
  deps: AccommodationDeps,
  actor: Actor,
  applicationId: string | null,
): Promise<Result<{ items: readonly unknown[]; total: number }>> {
  const decision = checkRead(actor);
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const result = await deps.repository.listAccommodations(actor, applicationId);
  return { ok: true, items: result.items, total: result.total };
}

export async function createAccommodation(
  deps: AccommodationDeps,
  actor: Actor,
  applicationId: string | null,
  input: AccommodationCreate,
): Promise<Result<{ accommodation: unknown }>> {
  const decision = checkWrite(actor);
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.createAccommodation(actor, applicationId, input);
  if (record === null) return { ok: false, status: 404, reason: 'application_not_found' };
  return { ok: true, accommodation: record };
}

export async function updateAccommodationStatus(
  deps: AccommodationDeps,
  actor: Actor,
  accommodationId: string,
  input: AccommodationStatusUpdate,
): Promise<Result<{ accommodation: unknown }>> {
  const decision = checkWrite(actor);
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.updateAccommodationStatus(actor, accommodationId, input);
  if (record === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, accommodation: record };
}
