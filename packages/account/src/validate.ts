import {
  PROFILE_DENSITIES,
  PROFILE_THEMES,
  type ProfileDensity,
  type ProfileTheme,
  type ProfileUpdate,
} from './types.js';

export type ParseResult =
  | { readonly ok: true; readonly value: ProfileUpdate }
  | { readonly ok: false; readonly errors: readonly string[] };

const ALLOWED_KEYS = new Set([
  'preferredName',
  'locale',
  'timezone',
  'theme',
  'density',
  'reducedMotion',
]);

const MAX_STRING = 200;

/**
 * Validates a raw `patch_me` body into a `ProfileUpdate`. Unknown properties are rejected and the
 * patch must be non-empty (per the ProfileUpdate DTO contract).
 */
export function parseProfileUpdate(raw: unknown): ParseResult {
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

  const value: {
    preferredName?: string;
    locale?: string;
    timezone?: string;
    theme?: ProfileTheme;
    density?: ProfileDensity;
    reducedMotion?: boolean;
  } = {};

  const readString = (key: 'preferredName' | 'locale' | 'timezone'): void => {
    const v = input[key];
    if (v === undefined) return;
    if (typeof v !== 'string' || v.length === 0 || v.length > MAX_STRING) {
      errors.push(`${key} must be a non-empty string up to ${MAX_STRING} chars`);
      return;
    }
    value[key] = v;
  };

  readString('preferredName');
  readString('locale');
  readString('timezone');

  if (input.theme !== undefined) {
    if (typeof input.theme !== 'string' || !PROFILE_THEMES.includes(input.theme as ProfileTheme)) {
      errors.push(`theme must be one of: ${PROFILE_THEMES.join(', ')}`);
    } else {
      value.theme = input.theme as ProfileTheme;
    }
  }

  if (input.density !== undefined) {
    if (
      typeof input.density !== 'string' ||
      !PROFILE_DENSITIES.includes(input.density as ProfileDensity)
    ) {
      errors.push(`density must be one of: ${PROFILE_DENSITIES.join(', ')}`);
    } else {
      value.density = input.density as ProfileDensity;
    }
  }

  if (input.reducedMotion !== undefined) {
    if (typeof input.reducedMotion !== 'boolean') {
      errors.push('reducedMotion must be a boolean');
    } else {
      value.reducedMotion = input.reducedMotion;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  if (Object.keys(value).length === 0) {
    return { ok: false, errors: ['at least one field must be provided'] };
  }
  return { ok: true, value };
}
