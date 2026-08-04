/** Types for general preferences (OpenAPI `*_me_preferences`; FR-ACC-12, FR-ACC-13). */
import type { ProfileDensity, ProfileTheme } from './types.js';

/** The locale + accessibility subset of `iam.user_profiles` as read for the caller. */
export interface PreferencesRecord {
  readonly locale: string;
  readonly timezone: string;
  readonly dateFormat: string;
  readonly theme: ProfileTheme;
  readonly density: ProfileDensity;
  readonly reducedMotion: boolean;
  readonly accessibility: Readonly<Record<string, boolean>>;
}

/** Response projection for `get_me_preferences`/`put_me_preferences` (UserPreferences). */
export type UserPreferencesDto = PreferencesRecord;

/** Validated `put_me_preferences` body; a full replacement of the preferences subset. */
export interface PreferencesUpdate {
  readonly locale: string;
  readonly timezone: string;
  readonly dateFormat: string;
  readonly theme: ProfileTheme;
  readonly density: ProfileDensity;
  readonly reducedMotion: boolean;
  readonly accessibility: Readonly<Record<string, boolean>>;
}
