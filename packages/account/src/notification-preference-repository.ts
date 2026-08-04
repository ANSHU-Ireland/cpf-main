import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type {
  NotificationChannel,
  NotificationPreferenceListQuery,
  NotificationPreferenceRecord,
  NotificationPreferenceSetting,
  DigestFrequency,
} from './notification-preference-types.js';

export interface NotificationPreferenceListResult {
  readonly items: readonly NotificationPreferenceRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface NotificationPreferenceRepository {
  listPreferences(
    actor: Actor,
    query: NotificationPreferenceListQuery,
  ): Promise<NotificationPreferenceListResult>;
  /** Upserts the caller's preferences and appends one audit event, atomically. */
  applyPreferenceUpdate(
    actor: Actor,
    settings: readonly NotificationPreferenceSetting[],
  ): Promise<void>;
}

export interface PgNotificationPreferenceRepositoryOptions {
  /** Least-privilege DB role to assume so RLS is enforced (superusers bypass RLS). */
  readonly role?: string;
}

interface PreferenceRow {
  id: string;
  channel: NotificationChannel;
  category: string;
  enabled: boolean;
  mandatory: boolean;
  digest_frequency: DigestFrequency;
  updated_at: Date;
}

function toRecord(row: PreferenceRow): NotificationPreferenceRecord {
  return {
    id: row.id,
    channel: row.channel,
    category: row.category,
    enabled: row.enabled,
    mandatory: row.mandatory,
    digestFrequency: row.digest_frequency,
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Reads/updates the caller's own preferences through the `notification_preference_self` RLS policy. */
export class PgNotificationPreferenceRepository implements NotificationPreferenceRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgNotificationPreferenceRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async listPreferences(
    actor: Actor,
    query: NotificationPreferenceListQuery,
  ): Promise<NotificationPreferenceListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM iam.notification_preferences',
      );
      const total = Number(totalRes.rows[0]?.count ?? '0');

      // Keyset pagination over (updated_at, id); fetch one extra row to detect `hasMore`.
      const params: unknown[] = [];
      let keyset = '';
      if (query.cursor !== null) {
        keyset = 'WHERE (updated_at, id) < ($1, $2)';
        params.push(query.cursor.ts, query.cursor.id);
      }
      params.push(query.limit + 1);

      const res = await client.query<PreferenceRow>(
        `SELECT id, channel, category, enabled, mandatory, digest_frequency, updated_at
           FROM iam.notification_preferences
           ${keyset}
          ORDER BY updated_at DESC, id DESC
          LIMIT $${params.length}`,
        params,
      );

      const hasMore = res.rows.length > query.limit;
      const rows = hasMore ? res.rows.slice(0, query.limit) : res.rows;
      return { items: rows.map(toRecord), total, hasMore };
    });
  }

  async applyPreferenceUpdate(
    actor: Actor,
    settings: readonly NotificationPreferenceSetting[],
  ): Promise<void> {
    await withTenant(this.#pool, this.#context(actor), async (client) => {
      for (const setting of settings) {
        // A `mandatory` preference can never be disabled by the user (server keeps it enabled).
        await client.query(
          `INSERT INTO iam.notification_preferences (user_id, channel, category, enabled, digest_frequency)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, channel, category) DO UPDATE
             SET enabled = CASE
                             WHEN iam.notification_preferences.mandatory THEN true
                             ELSE EXCLUDED.enabled
                           END,
                 digest_frequency = EXCLUDED.digest_frequency,
                 updated_at = now()`,
          [
            actor.userId,
            setting.channel,
            setting.category,
            setting.enabled,
            setting.digestFrequency ?? 'immediate',
          ],
        );
      }

      // `put_me_notification_preferences` is x-audit-event: true — chain the event in the same tx.
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'notification_preferences.update',
        resourceType: 'notification_preference',
        resourceId: actor.userId,
        outcome: 'success',
        metadata: {
          count: settings.length,
          channels: [...new Set(settings.map((s) => s.channel))],
        },
      });
    });
  }
}
