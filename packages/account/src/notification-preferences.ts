import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import type { NotificationPreferenceRepository } from './notification-preference-repository.js';
import {
  DIGEST_FREQUENCIES,
  NOTIFICATION_CHANNELS,
  type DigestFrequency,
  type NotificationChannel,
  type NotificationPreferenceDto,
  type NotificationPreferenceListQuery,
  type NotificationPreferencePageDto,
  type NotificationPreferenceRecord,
  type NotificationPreferenceSetting,
  type NotificationPreferenceUpdate,
} from './notification-preference-types.js';
import type { Actor } from './types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const MAX_CATEGORY = 100;
const MAX_ITEMS = 200;

export type ParsePreferenceQueryResult =
  | { readonly ok: true; readonly value: NotificationPreferenceListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

export interface RawPreferenceQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

/** Validates `get_me_notification_preferences` query params (limit 1..100 default 25). */
export function parsePreferenceQuery(raw: RawPreferenceQuery): ParsePreferenceQueryResult {
  const errors: string[] = [];

  let limit = DEFAULT_LIMIT;
  if (raw.limit !== undefined) {
    const n = typeof raw.limit === 'number' ? raw.limit : Number(raw.limit);
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
      errors.push(`limit must be an integer between 1 and ${MAX_LIMIT}`);
    } else {
      limit = n;
    }
  }

  let cursor = null as NotificationPreferenceListQuery['cursor'];
  if (raw.cursor !== undefined && raw.cursor !== '') {
    if (raw.cursor.length > MAX_CURSOR) {
      errors.push(`cursor must be at most ${MAX_CURSOR} characters`);
    } else {
      const decoded = decodeCursor(raw.cursor);
      if (decoded === null) {
        errors.push('cursor is invalid');
      } else {
        cursor = decoded;
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { limit, cursor } };
}

export type ParsePreferenceUpdateResult =
  | { readonly ok: true; readonly value: NotificationPreferenceUpdate }
  | { readonly ok: false; readonly errors: readonly string[] };

const ITEM_KEYS = new Set(['channel', 'category', 'enabled', 'digestFrequency']);

/** Validates a raw `NotificationPreferenceUpdate` body; unknown properties are rejected. */
export function parsePreferenceUpdate(raw: unknown): ParsePreferenceUpdateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (key !== 'items') {
      errors.push(`unknown property: ${key}`);
    }
  }
  if (!Array.isArray(input.items)) {
    return { ok: false, errors: [...errors, 'items must be an array'] };
  }
  if (input.items.length === 0) {
    return { ok: false, errors: [...errors, 'items must not be empty'] };
  }
  if (input.items.length > MAX_ITEMS) {
    return { ok: false, errors: [...errors, `items must contain at most ${MAX_ITEMS} entries`] };
  }

  const settings: NotificationPreferenceSetting[] = [];
  const seen = new Set<string>();

  input.items.forEach((raw, index) => {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push(`items[${index}] must be an object`);
      return;
    }
    const item = raw as Record<string, unknown>;
    for (const key of Object.keys(item)) {
      if (!ITEM_KEYS.has(key)) {
        errors.push(`items[${index}] has unknown property: ${key}`);
      }
    }

    const channel = item.channel;
    if (
      typeof channel !== 'string' ||
      !NOTIFICATION_CHANNELS.includes(channel as NotificationChannel)
    ) {
      errors.push(`items[${index}].channel must be one of: ${NOTIFICATION_CHANNELS.join(', ')}`);
    }
    const category = item.category;
    if (typeof category !== 'string' || category.length === 0 || category.length > MAX_CATEGORY) {
      errors.push(
        `items[${index}].category must be a non-empty string up to ${MAX_CATEGORY} chars`,
      );
    }
    if (typeof item.enabled !== 'boolean') {
      errors.push(`items[${index}].enabled must be a boolean`);
    }
    let digestFrequency: DigestFrequency | undefined;
    if (item.digestFrequency !== undefined) {
      if (
        typeof item.digestFrequency !== 'string' ||
        !DIGEST_FREQUENCIES.includes(item.digestFrequency as DigestFrequency)
      ) {
        errors.push(
          `items[${index}].digestFrequency must be one of: ${DIGEST_FREQUENCIES.join(', ')}`,
        );
      } else {
        digestFrequency = item.digestFrequency as DigestFrequency;
      }
    }

    if (typeof channel === 'string' && typeof category === 'string') {
      const dedupeKey = `${channel}::${category}`;
      if (seen.has(dedupeKey)) {
        errors.push(`items[${index}] duplicates channel/category ${dedupeKey}`);
      }
      seen.add(dedupeKey);
    }

    if (
      typeof channel === 'string' &&
      NOTIFICATION_CHANNELS.includes(channel as NotificationChannel) &&
      typeof category === 'string' &&
      category.length > 0 &&
      typeof item.enabled === 'boolean'
    ) {
      settings.push({
        channel: channel as NotificationChannel,
        category,
        enabled: item.enabled,
        ...(digestFrequency !== undefined ? { digestFrequency } : {}),
      });
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { items: settings } };
}

function toDto(record: NotificationPreferenceRecord): NotificationPreferenceDto {
  return {
    id: record.id,
    channel: record.channel,
    category: record.category,
    enabled: record.enabled,
    mandatory: record.mandatory,
    digestFrequency: record.digestFrequency,
  };
}

async function readPage(
  repository: NotificationPreferenceRepository,
  actor: Actor,
  query: NotificationPreferenceListQuery,
): Promise<NotificationPreferencePageDto> {
  const { items, total, hasMore } = await repository.listPreferences(actor, query);
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last !== undefined ? encodeCursor({ ts: last.updatedAt, id: last.id }) : null;
  return { items: items.map(toDto), nextCursor, total };
}

export interface NotificationPreferenceDeps {
  readonly repository: NotificationPreferenceRepository;
  readonly permissions?: readonly Permission[];
}

export type ListPreferencesResult =
  | { readonly ok: true; readonly page: NotificationPreferencePageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

function authorize(actor: Actor, action: 'read' | 'write', permissions: readonly Permission[]) {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: [...actor.roles, AUTHENTICATED_ROLE] },
    action,
    { type: 'self_notification_pref', tenantId: actor.tenantId },
    permissions,
  );
}

/** `get_me_notification_preferences`: deny-by-default read of the caller's own preferences. */
export async function listNotificationPreferences(
  deps: NotificationPreferenceDeps,
  actor: Actor,
  query: NotificationPreferenceListQuery,
): Promise<ListPreferencesResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = authorize(actor, 'read', permissions);
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }
  return { ok: true, page: await readPage(deps.repository, actor, query) };
}

export type UpdatePreferencesResult = ListPreferencesResult;

/** `put_me_notification_preferences`: deny-by-default, audited upsert, then return the first page. */
export async function updateNotificationPreferences(
  deps: NotificationPreferenceDeps,
  actor: Actor,
  update: NotificationPreferenceUpdate,
): Promise<UpdatePreferencesResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = authorize(actor, 'write', permissions);
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  await deps.repository.applyPreferenceUpdate(actor, update.items);
  return {
    ok: true,
    page: await readPage(deps.repository, actor, { limit: DEFAULT_LIMIT, cursor: null }),
  };
}
