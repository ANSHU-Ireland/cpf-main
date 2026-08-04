import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import type { PreferencesRepository } from './preferences-repository.js';
import type { PreferencesUpdate, UserPreferencesDto } from './preferences-types.js';
import {
  PROFILE_DENSITIES,
  PROFILE_THEMES,
  type ProfileDensity,
  type ProfileTheme,
} from './types.js';
import type { Actor } from './types.js';

const MAX_LOCALE = 35;
const MAX_TIMEZONE = 64;
const MAX_DATE_FORMAT = 32;
const MAX_ACCESSIBILITY_KEYS = 50;
const MAX_ACCESSIBILITY_KEY = 64;

const ALLOWED_KEYS = new Set([
  'locale',
  'timezone',
  'dateFormat',
  'theme',
  'density',
  'reducedMotion',
  'accessibility',
]);

export type ParsePreferencesResult =
  | { readonly ok: true; readonly value: PreferencesUpdate }
  | { readonly ok: false; readonly errors: readonly string[] };

function parseBoundedString(
  value: unknown,
  field: string,
  max: number,
  errors: string[],
): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) {
    errors.push(`${field} must be a non-empty string up to ${max} chars`);
    return undefined;
  }
  return value;
}

function parseAccessibility(
  value: unknown,
  errors: string[],
): Readonly<Record<string, boolean>> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('accessibility must be an object of boolean flags');
    return undefined;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_ACCESSIBILITY_KEYS) {
    errors.push(`accessibility must contain at most ${MAX_ACCESSIBILITY_KEYS} keys`);
    return undefined;
  }
  const result: Record<string, boolean> = {};
  let valid = true;
  for (const [key, val] of entries) {
    if (key.length === 0 || key.length > MAX_ACCESSIBILITY_KEY) {
      errors.push(`accessibility keys must be 1..${MAX_ACCESSIBILITY_KEY} chars`);
      valid = false;
      continue;
    }
    if (typeof val !== 'boolean') {
      errors.push(`accessibility.${key} must be a boolean`);
      valid = false;
      continue;
    }
    result[key] = val;
  }
  return valid ? result : undefined;
}

/** Validates a `put_me_preferences` body; a full replacement, so every field is required. */
export function parsePreferencesUpdate(raw: unknown): ParsePreferencesResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) {
      errors.push(`unknown property: ${key}`);
    }
  }

  const locale = parseBoundedString(input.locale, 'locale', MAX_LOCALE, errors);
  const timezone = parseBoundedString(input.timezone, 'timezone', MAX_TIMEZONE, errors);
  const dateFormat = parseBoundedString(input.dateFormat, 'dateFormat', MAX_DATE_FORMAT, errors);

  let theme: ProfileTheme | undefined;
  if (typeof input.theme !== 'string' || !PROFILE_THEMES.includes(input.theme as ProfileTheme)) {
    errors.push(`theme must be one of: ${PROFILE_THEMES.join(', ')}`);
  } else {
    theme = input.theme as ProfileTheme;
  }

  let density: ProfileDensity | undefined;
  if (
    typeof input.density !== 'string' ||
    !PROFILE_DENSITIES.includes(input.density as ProfileDensity)
  ) {
    errors.push(`density must be one of: ${PROFILE_DENSITIES.join(', ')}`);
  } else {
    density = input.density as ProfileDensity;
  }

  if (typeof input.reducedMotion !== 'boolean') {
    errors.push('reducedMotion must be a boolean');
  }

  const accessibility = parseAccessibility(input.accessibility, errors);

  if (
    errors.length > 0 ||
    locale === undefined ||
    timezone === undefined ||
    dateFormat === undefined ||
    theme === undefined ||
    density === undefined ||
    typeof input.reducedMotion !== 'boolean' ||
    accessibility === undefined
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      locale,
      timezone,
      dateFormat,
      theme,
      density,
      reducedMotion: input.reducedMotion,
      accessibility,
    },
  };
}

export interface PreferencesDeps {
  readonly repository: PreferencesRepository;
  readonly permissions?: readonly Permission[];
}

export type GetPreferencesResult =
  | { readonly ok: true; readonly preferences: UserPreferencesDto }
  | { readonly ok: false; readonly status: 403 | 404; readonly reason: string };

export type ReplacePreferencesResult =
  | { readonly ok: true; readonly preferences: UserPreferencesDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

function authorize(actor: Actor, action: 'read' | 'write', permissions: readonly Permission[]) {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: [...actor.roles, AUTHENTICATED_ROLE] },
    action,
    { type: 'self_preferences', tenantId: actor.tenantId },
    permissions,
  );
}

/** `get_me_preferences`: deny-by-default read of the caller's own preferences. */
export async function getPreferences(
  deps: PreferencesDeps,
  actor: Actor,
): Promise<GetPreferencesResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = authorize(actor, 'read', permissions);
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const record = await deps.repository.readPreferences(actor);
  if (record === null) {
    return { ok: false, status: 404, reason: 'preferences not found' };
  }
  return { ok: true, preferences: record };
}

/** `put_me_preferences`: deny-by-default, audited full replacement, then return the stored view. */
export async function replacePreferences(
  deps: PreferencesDeps,
  actor: Actor,
  update: PreferencesUpdate,
): Promise<ReplacePreferencesResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = authorize(actor, 'write', permissions);
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const preferences = await deps.repository.replacePreferences(actor, update);
  return { ok: true, preferences };
}
