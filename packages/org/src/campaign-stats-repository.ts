import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import type { Actor } from './types.js';
import type { CampaignStatsRecord, CampaignStatsRepository } from './campaign-stats.js';

interface StatsRow {
  status: string;
  count: string;
}

export class PgCampaignStatsRepository implements CampaignStatsRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: { role?: string } = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async getCampaignStats(actor: Actor, campaignId: string): Promise<CampaignStatsRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      // Check campaign exists
      const campaignRes = await client.query(
        `SELECT id FROM hiring.campaigns WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, campaignId],
      );
      if (campaignRes.rows.length === 0) return null;

      const res = await client.query<StatsRow>(
        `SELECT status, COUNT(*)::text AS count
           FROM hiring.applications
          WHERE tenant_id = $1 AND campaign_id = $2
          GROUP BY status`,
        [actor.tenantId, campaignId],
      );

      const byStatus: Record<string, number> = {};
      let total = 0;
      for (const row of res.rows) {
        const cnt = parseInt(row.count, 10);
        byStatus[row.status] = cnt;
        total += cnt;
      }

      return { campaignId, totalApplications: total, byStatus };
    });
  }
}
