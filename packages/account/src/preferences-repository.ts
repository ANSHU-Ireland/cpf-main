import type { Pool, PoolClient } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type { ProfileDensity, ProfileTheme } from './types.js';
import type { PreferencesRecord, PreferencesUpdate } from './preferences-types.js';

export interface PreferencesRepository {
  readPreferences(actor: Actor): Promise<PreferencesRecord | null>;
  /** Replaces the caller's preferences and appends one audit event, atomically. */
  replacePreferences(actor: Actor, update: PreferencesUpdate): Promise<PreferencesRecord>;
}

export interface PgPreferencesRepositoryOptions {
  /** Least-privilege DB role to assume so RLS is enforced (superusers bypass RLS). */
  readonly role?: string;
}

interface PreferencesRow {
  locale: string;
  timezone: string;
  date_format: string;
  theme: ProfileTheme;
  density: ProfileDensity;
  reduced_motion: boolean;
  accessibility_preferences: unknown;
}

/** Keeps only boolean-valued entries so a legacy free-form jsonb never leaks non-boolean data. */
function toAccessibility(value: unknown): Readonly<Record<string, boolean>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === 'boolean') {
      result[key] = val;
    }
  }
  return result;
}

function toRecord(row: PreferencesRow): PreferencesRecord {
  return {
    locale: row.locale,
    timezone: row.timezone,
    dateFormat: row.date_format,
    theme: row.theme,
    density: row.density,
    reducedMotion: row.reduced_motion,
    accessibility: toAccessibility(row.accessibility_preferences),
  };
}

const SELECT_PREFERENCES = `SELECT locale, timezone, date_format, theme, density, reduced_motion,
                                   accessibility_preferences
                              FROM iam.user_profiles
                             WHERE user_id = $1`;

/** Reads/replaces the caller's own preferences through the `user_profile_self` RLS policy. */
export class PgPreferencesRepository implements PreferencesRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgPreferencesRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async readPreferences(actor: Actor): Promise<PreferencesRecord | null> {
    return withTenant(this.#pool, this.#context(actor), (client) => read(client, actor));
  }

  async replacePreferences(actor: Actor, update: PreferencesUpdate): Promise<PreferencesRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      await client.query(
        `INSERT INTO iam.user_profiles
           (user_id, locale, timezone, date_format, theme, density, reduced_motion, accessibility_preferences)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
         ON CONFLICT (user_id) DO UPDATE
           SET locale = EXCLUDED.locale,
               timezone = EXCLUDED.timezone,
               date_format = EXCLUDED.date_format,
               theme = EXCLUDED.theme,
               density = EXCLUDED.density,
               reduced_motion = EXCLUDED.reduced_motion,
               accessibility_preferences = EXCLUDED.accessibility_preferences,
               updated_at = now()`,
        [
          actor.userId,
          update.locale,
          update.timezone,
          update.dateFormat,
          update.theme,
          update.density,
          update.reducedMotion,
          JSON.stringify(update.accessibility),
        ],
      );

      // `put_me_preferences` is x-audit-event: true — chain the event in the same transaction.
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'preferences.update',
        resourceType: 'user_preferences',
        resourceId: actor.userId,
        outcome: 'success',
        metadata: { accessibilityKeys: Object.keys(update.accessibility).length },
      });

      const record = await read(client, actor);
      if (record === null) {
        throw new Error('preferences row missing after upsert');
      }
      return record;
    });
  }
}

async function read(client: PoolClient, actor: Actor): Promise<PreferencesRecord | null> {
  const res = await client.query<PreferencesRow>(SELECT_PREFERENCES, [actor.userId]);
  const row = res.rows[0];
  return row ? toRecord(row) : null;
}
