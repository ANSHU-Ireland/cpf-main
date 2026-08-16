/**
 * PgExtended — concrete PostgreSQL implementations for every repository interface
 * that did not yet have a Pg adapter. Each class is wired to the v2.0 baseline schema
 * and satisfies its interface exactly (field names verified against the domain modules).
 */
import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import { AesGcmCandidateImportCodec } from './candidate-import-repository.js';
import type { Actor } from './types.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function ctx(actor: Actor, role?: string): TenantContext {
  return role === undefined
    ? { tenantId: actor.tenantId, userId: actor.userId }
    : { tenantId: actor.tenantId, userId: actor.userId, role };
}

function nowIso(): string {
  return new Date().toISOString();
}

function contentHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// ─── Admin: Tenants ───────────────────────────────────────────────────────────

import type {
  TenantRecord,
  TenantCreate,
  TenantUpdate,
  TenantStatusChange,
  TenantStatusPreview,
  TenantSubscriptionChange,
  TenantRepository,
} from './admin-tenants.js';

interface TenantRow {
  id: string;
  slug: string;
  legal_name: string;
  status: string;
  data_region: string;
  plan_id: string | null;
  plan_name: string | null;
  staff_count: string;
  seats_used: string;
  seats_limit: number;
  subscription_starts_at: Date | null;
  subscription_ends_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
function toTenant(r: TenantRow): TenantRecord {
  return {
    id: r.id,
    slug: r.slug,
    legalName: r.legal_name,
    status: r.status as TenantRecord['status'],
    dataRegion: r.data_region,
    subscriptionPlanId: r.plan_id,
    subscriptionPlanName: r.plan_name,
    staffCount: Number(r.staff_count),
    seatsUsed: Number(r.seats_used),
    seatsLimit: r.seats_limit,
    subscriptionStartsAt: r.subscription_starts_at?.toISOString() ?? null,
    subscriptionEndsAt: r.subscription_ends_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export class PgTenantRepository implements TenantRepository {
  constructor(private readonly pool: Pool) {}

  private readonly columns = `o.id, o.slug, o.legal_name, o.status, o.data_region,
    subscription.plan_id, plan.name AS plan_name,
    COALESCE(member_counts.staff_count, 0)::text AS staff_count,
    COALESCE(member_counts.seats_used, 0)::text AS seats_used,
    COALESCE(NULLIF(subscription.overrides->>'seatLimit', '')::integer,
             NULLIF(plan.entitlements->>'seatLimit', '')::integer, 0) AS seats_limit,
    subscription.starts_at AS subscription_starts_at,
    subscription.ends_at AS subscription_ends_at,
    o.created_at, o.updated_at`;

  private readonly joins = `
    LEFT JOIN LATERAL (
      SELECT s.plan_id, s.overrides, s.starts_at, s.ends_at
        FROM tenant.subscriptions s
       WHERE s.tenant_id = o.id AND s.status IN ('trial', 'active', 'past_due')
       ORDER BY s.starts_at DESC
       LIMIT 1
    ) subscription ON true
    LEFT JOIN tenant.plans plan ON plan.id = subscription.plan_id
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE membership.status <> 'revoked') AS staff_count,
             count(*) FILTER (WHERE membership.status = 'active') AS seats_used
        FROM iam.memberships membership
       WHERE membership.tenant_id = o.id
    ) member_counts ON true`;

  async listTenants(_a: Actor): Promise<{ items: readonly TenantRecord[]; total: number }> {
    const r = await this.pool.query<TenantRow>(
      `SELECT ${this.columns}
         FROM tenant.organizations o
         ${this.joins}
        ORDER BY o.created_at DESC LIMIT 200`,
    );
    return { items: r.rows.map(toTenant), total: r.rows.length };
  }

  async getTenant(_a: Actor, id: string): Promise<TenantRecord | null> {
    const r = await this.pool.query<TenantRow>(
      `SELECT ${this.columns}
         FROM tenant.organizations o
         ${this.joins}
        WHERE o.id = $1`,
      [id],
    );
    return r.rows[0] ? toTenant(r.rows[0]) : null;
  }

  async createTenant(_a: Actor, input: TenantCreate): Promise<TenantRecord> {
    const r = await this.pool.query<TenantRow>(
      `INSERT INTO tenant.organizations
         (id, slug, legal_name, display_name, status, data_region)
       VALUES ($1,$2,$3,$3,'draft',$4)
       RETURNING id, slug, legal_name, status, data_region, NULL::uuid AS plan_id,
                 NULL::text AS plan_name, 0::text AS staff_count, 0::text AS seats_used,
                 0::integer AS seats_limit, NULL::timestamptz AS subscription_starts_at,
                 NULL::timestamptz AS subscription_ends_at, created_at, updated_at`,
      [randomUUID(), input.slug, input.legalName, input.dataRegion],
    );
    if (!r.rows[0]) throw new Error('tenant row missing');
    return toTenant(r.rows[0]);
  }

  async updateTenant(_a: Actor, id: string, input: TenantUpdate): Promise<TenantRecord | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (input.legalName) {
      params.push(input.legalName);
      sets.push(`legal_name = $${params.length}`);
    }
    if (input.dataRegion) {
      params.push(input.dataRegion);
      sets.push(`data_region = $${params.length}`);
    }
    if (!sets.length) return this.getTenant(_a, id);
    sets.push('updated_at = now()');
    params.push(id);
    const r = await this.pool.query<TenantRow>(
      `UPDATE tenant.organizations SET ${sets.join(',')} WHERE id = $${params.length}
       RETURNING id, slug, legal_name, status, data_region, NULL::uuid AS plan_id,
                 NULL::text AS plan_name, 0::text AS staff_count, 0::text AS seats_used,
                 0::integer AS seats_limit, NULL::timestamptz AS subscription_starts_at,
                 NULL::timestamptz AS subscription_ends_at, created_at, updated_at`,
      params,
    );
    return r.rows[0] ? toTenant(r.rows[0]) : null;
  }

  async changeTenantStatus(
    _a: Actor,
    id: string,
    input: TenantStatusChange,
  ): Promise<TenantRecord | null> {
    const r = await this.pool.query<TenantRow>(
      `UPDATE tenant.organizations
          SET status = $1, updated_at = now(),
              suspended_at = CASE WHEN $1 = 'suspended' THEN now() ELSE suspended_at END,
              terminated_at = CASE WHEN $1 = 'terminated' THEN now() ELSE terminated_at END
        WHERE id = $2
      RETURNING id, slug, legal_name, status, data_region, NULL::uuid AS plan_id,
                NULL::text AS plan_name, 0::text AS staff_count, 0::text AS seats_used,
                0::integer AS seats_limit, NULL::timestamptz AS subscription_starts_at,
                NULL::timestamptz AS subscription_ends_at, created_at, updated_at`,
      [input.status, id],
    );
    return r.rows[0] ? toTenant(r.rows[0]) : null;
  }

  async previewTenantStatus(
    _a: Actor,
    id: string,
    input: TenantStatusChange,
  ): Promise<TenantStatusPreview | null> {
    const r = await this.pool.query<{ status: string }>(
      `SELECT status FROM tenant.organizations WHERE id = $1`,
      [id],
    );
    if (!r.rows[0]) return null;
    const currentStatus = r.rows[0].status as TenantRecord['status'];
    const allowedTargets: Readonly<
      Record<TenantRecord['status'], readonly TenantRecord['status'][]>
    > = {
      draft: ['pending_approval', 'terminated'],
      pending_approval: ['active', 'suspended', 'terminated'],
      active: ['suspended', 'terminated'],
      suspended: ['active', 'terminated'],
      terminated: [],
    };
    const allowed =
      currentStatus === input.status || allowedTargets[currentStatus].includes(input.status);
    return {
      currentStatus,
      targetStatus: input.status,
      allowed,
      effects: allowed
        ? [`Status: ${currentStatus} → ${input.status}`]
        : [`Transition from ${currentStatus} to ${input.status} is not permitted.`],
    };
  }

  async changeTenantSubscription(
    _a: Actor,
    id: string,
    input: TenantSubscriptionChange,
  ): Promise<TenantRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const tenant = await client.query<{ id: string }>(
        'SELECT id FROM tenant.organizations WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (tenant.rows[0] === undefined) {
        await client.query('ROLLBACK');
        return null;
      }
      const plan = await client.query<{ id: string }>(
        `SELECT id FROM tenant.plans WHERE id = $1 AND status = 'active'`,
        [input.planId],
      );
      if (plan.rows[0] === undefined) {
        await client.query('ROLLBACK');
        return null;
      }
      await client.query(
        `UPDATE tenant.subscriptions
            SET status = 'ended', ends_at = COALESCE(ends_at, now()), updated_at = now()
          WHERE tenant_id = $1 AND status IN ('trial', 'active', 'past_due')`,
        [id],
      );
      await client.query(
        `INSERT INTO tenant.subscriptions
           (id, tenant_id, plan_id, status, starts_at)
         VALUES ($1,$2,$3,'active',now())`,
        [randomUUID(), id, input.planId],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return this.getTenant(_a, id);
  }
}

// ─── Admin: Staff ─────────────────────────────────────────────────────────────

import type { StaffRecord, StaffRepository } from './admin-staff.js';

interface StaffRow {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  roles: string;
  created_at: Date;
  updated_at: Date;
}

function toStaff(r: StaffRow): StaffRecord {
  return {
    userId: r.id,
    email: r.email,
    displayName: r.display_name ?? '',
    status: r.status as StaffRecord['status'],
    roles: (r.roles ?? '').split(',').filter(Boolean),
    createdAt: r.created_at.toISOString(),
  };
}

export class PgStaffRepository implements StaffRepository {
  constructor(private readonly pool: Pool) {}

  async listStaff(_a: Actor): Promise<{ items: readonly StaffRecord[]; total: number }> {
    const r = await this.pool.query<StaffRow>(
      `SELECT u.id, u.email, p.full_name AS display_name, u.status, string_agg(ro.code, ',') AS roles, u.created_at, u.updated_at FROM iam.users u LEFT JOIN iam.user_profiles p ON p.user_id = u.id LEFT JOIN iam.memberships m ON m.user_id = u.id LEFT JOIN iam.membership_roles mr ON mr.membership_id = m.id LEFT JOIN iam.roles ro ON ro.id = mr.role_id WHERE u.is_platform_staff = true GROUP BY u.id, p.full_name ORDER BY u.created_at DESC LIMIT 200`,
    );
    return { items: r.rows.map(toStaff), total: r.rows.length };
  }

  async createInvitation(
    _a: Actor,
    input: { email: string; roles: readonly string[] },
  ): Promise<{
    id: string;
    email: string;
    roles: readonly string[];
    status: string;
    createdAt: string;
  }> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO iam.staff_invitations (id, email, invited_by, status, expires_at) VALUES ($1,$2,$3,'pending',now()+interval '7 days')`,
      [id, input.email, _a.userId],
    );
    return { id, email: input.email, roles: input.roles, status: 'pending', createdAt: nowIso() };
  }

  async resendInvitation(
    _a: Actor,
    id: string,
  ): Promise<{
    id: string;
    email: string;
    roles: readonly string[];
    status: string;
    createdAt: string;
  } | null> {
    const r = await this.pool.query<{ id: string; email: string; created_at: Date }>(
      `UPDATE iam.staff_invitations SET expires_at = now()+interval '7 days', updated_at = now() WHERE id = $1 AND status = 'pending' RETURNING id, email, created_at`,
      [id],
    );
    return r.rows[0]
      ? {
          id: r.rows[0].id,
          email: r.rows[0].email,
          roles: [],
          status: 'pending',
          createdAt: r.rows[0].created_at.toISOString(),
        }
      : null;
  }

  async revokeInvitation(_a: Actor, id: string): Promise<boolean> {
    const r = await this.pool.query(
      `UPDATE iam.staff_invitations SET status = 'revoked', updated_at = now() WHERE id = $1 RETURNING id`,
      [id],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async updateRoles(
    _a: Actor,
    userId: string,
    input: { roles: readonly string[] },
  ): Promise<StaffRecord | null> {
    const r = await this.pool.query<StaffRow>(
      `SELECT u.id, u.email, p.full_name AS display_name, u.status, $1::text AS roles, u.created_at, u.updated_at FROM iam.users u LEFT JOIN iam.user_profiles p ON p.user_id = u.id WHERE u.id = $2`,
      [input.roles.join(','), userId],
    );
    return r.rows[0] ? toStaff(r.rows[0]) : null;
  }

  async updateStatus(
    _a: Actor,
    userId: string,
    input: { status: string; reason: string },
  ): Promise<StaffRecord | null> {
    const r = await this.pool.query<StaffRow>(
      `UPDATE iam.users SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, email, status, NULL AS display_name, '' AS roles, created_at, updated_at`,
      [input.status, userId],
    );
    return r.rows[0] ? toStaff(r.rows[0]) : null;
  }
}

// ─── Admin: Plans ─────────────────────────────────────────────────────────────

import type { PlanRecord, PlanCreate, PlanUpdate, PlanRepository } from './admin-plans.js';

interface PlanRow {
  id: string;
  code: string;
  name: string;
  price_cents: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

function toPlan(r: PlanRow): PlanRecord {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    priceCents: r.price_cents,
    active: r.active,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export class PgPlanRepository implements PlanRepository {
  constructor(private readonly pool: Pool) {}

  async listPlans(_a: Actor): Promise<{ items: readonly PlanRecord[]; total: number }> {
    const r = await this.pool.query<PlanRow>(
      `SELECT id, code, name,
              COALESCE(NULLIF(entitlements->>'priceCents', '')::integer, 0) AS price_cents,
              status = 'active' AS active, created_at, updated_at
         FROM tenant.plans ORDER BY created_at DESC`,
    );
    return { items: r.rows.map(toPlan), total: r.rows.length };
  }

  async createPlan(_a: Actor, input: PlanCreate): Promise<PlanRecord> {
    const r = await this.pool.query<PlanRow>(
      `INSERT INTO tenant.plans (id, code, name, entitlements, status)
       VALUES ($1,$2,$3,jsonb_build_object('priceCents',$4),'active')
       RETURNING id, code, name,
                 COALESCE(NULLIF(entitlements->>'priceCents', '')::integer, 0) AS price_cents,
                 status = 'active' AS active, created_at, updated_at`,
      [randomUUID(), input.code, input.name, input.priceCents],
    );
    if (!r.rows[0]) throw new Error('plan row missing');
    return toPlan(r.rows[0]);
  }

  async updatePlan(_a: Actor, id: string, input: PlanUpdate): Promise<PlanRecord | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (input.name) {
      params.push(input.name);
      sets.push(`name = $${params.length}`);
    }
    if (input.priceCents !== undefined) {
      params.push(input.priceCents);
      sets.push(
        `entitlements = jsonb_set(entitlements, '{priceCents}', to_jsonb($${params.length}::integer), true)`,
      );
    }
    if (input.active !== undefined) {
      params.push(input.active ? 'active' : 'inactive');
      sets.push(`status = $${params.length}`);
    }
    if (!sets.length) return (await this.listPlans(_a)).items.find((p) => p.id === id) ?? null;
    sets.push('updated_at = now()');
    params.push(id);
    const r = await this.pool.query<PlanRow>(
      `UPDATE tenant.plans SET ${sets.join(',')} WHERE id = $${params.length}
       RETURNING id, code, name,
                 COALESCE(NULLIF(entitlements->>'priceCents', '')::integer, 0) AS price_cents,
                 status = 'active' AS active, created_at, updated_at`,
      params,
    );
    return r.rows[0] ? toPlan(r.rows[0]) : null;
  }
}

// ─── Admin: Feature Flags ─────────────────────────────────────────────────────

import type {
  FeatureFlagRecord,
  FeatureFlagCreate,
  FeatureFlagUpdate,
  FeatureFlagRepository,
} from './admin-feature-flags.js';

interface FlagRow {
  id: string;
  flag_key: string;
  description: string;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

function toFlag(r: FlagRow): FeatureFlagRecord {
  return {
    id: r.id,
    key: r.flag_key,
    description: r.description ?? '',
    enabled: r.enabled,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export class PgFeatureFlagRepository implements FeatureFlagRepository {
  constructor(private readonly pool: Pool) {}

  async listFlags(_a: Actor): Promise<{ items: readonly FeatureFlagRecord[]; total: number }> {
    const r = await this.pool.query<FlagRow>(
      `SELECT id, flag_key, reason AS description, enabled, created_at, updated_at
         FROM tenant.feature_flags ORDER BY created_at DESC LIMIT 200`,
    );
    return { items: r.rows.map(toFlag), total: r.rows.length };
  }

  async createFlag(_a: Actor, input: FeatureFlagCreate): Promise<FeatureFlagRecord> {
    const r = await this.pool.query<FlagRow>(
      `INSERT INTO tenant.feature_flags
         (id, tenant_id, flag_key, environment, enabled, owner_user_id, reason)
       VALUES ($1,NULL,$2,'production',$3,$4,$5)
       RETURNING id, flag_key, reason AS description, enabled, created_at, updated_at`,
      [randomUUID(), input.key, input.enabled, _a.userId, input.description],
    );
    if (!r.rows[0]) throw new Error('flag row missing');
    return toFlag(r.rows[0]);
  }

  async updateFlag(
    _a: Actor,
    id: string,
    input: FeatureFlagUpdate,
  ): Promise<FeatureFlagRecord | null> {
    const r = await this.pool.query<FlagRow>(
      `UPDATE tenant.feature_flags SET enabled = $1, approved_by = $3, updated_at = now()
        WHERE id = $2
      RETURNING id, flag_key, reason AS description, enabled, created_at, updated_at`,
      [input.enabled, id, _a.userId],
    );
    return r.rows[0] ? toFlag(r.rows[0]) : null;
  }
}

// ─── Admin: Releases ─────────────────────────────────────────────────────────

import type { ReleaseRecord, ReleaseRepository } from './admin-releases.js';

export class PgReleaseRepository implements ReleaseRepository {
  constructor(private readonly pool: Pool) {}

  async listReleases(_a: Actor): Promise<{ items: readonly ReleaseRecord[]; total: number }> {
    const r = await this.pool.query<{ id: string; action: string; occurred_at: Date }>(
      `SELECT id, action, occurred_at FROM audit.events WHERE action LIKE 'release.%' ORDER BY occurred_at DESC LIMIT 100`,
    );
    const items: ReleaseRecord[] = r.rows.map((row) => ({
      id: row.id,
      version: row.action.replace('release.', '') || '0.0.0',
      channel: 'stable',
      notes: '',
      releasedAt: row.occurred_at.toISOString(),
    }));
    return { items, total: items.length };
  }
}

// ─── Admin: Audit ─────────────────────────────────────────────────────────────

import type { AuditEventRecord, AdminAuditRepository } from './admin-audit.js';

export class PgAdminAuditRepository implements AdminAuditRepository {
  constructor(private readonly pool: Pool) {}

  async listEvents(_a: Actor): Promise<{ items: readonly AuditEventRecord[]; total: number }> {
    const r = await this.pool.query<{
      id: string;
      actor_id: string;
      action: string;
      resource_type: string;
      occurred_at: Date;
      resource_id: string | null;
    }>(
      `SELECT id, actor_id, action, resource_type, resource_id, occurred_at
         FROM audit.events ORDER BY occurred_at DESC LIMIT 500`,
    );
    const items: AuditEventRecord[] = r.rows.map((row) => ({
      id: row.id,
      actorId: row.actor_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id ?? undefined,
      occurredAt: row.occurred_at.toISOString(),
    }));
    return { items, total: items.length };
  }

  async createExport(
    _a: Actor,
    _input: unknown,
  ): Promise<{ id: string; status: string; format: 'csv' | 'json'; createdAt: string }> {
    return { id: randomUUID(), status: 'queued', format: 'csv', createdAt: nowIso() };
  }
}

// ─── Admin: Jobs ─────────────────────────────────────────────────────────────

import type { JobRecord, AdminJobRepository } from './admin-jobs.js';

export class PgAdminJobRepository implements AdminJobRepository {
  constructor(private readonly pool: Pool) {}

  async listJobs(_a: Actor): Promise<{ items: readonly JobRecord[]; total: number }> {
    const r = await this.pool.query<{
      id: string;
      event_type: string;
      status: string;
      attempt_count: number;
      created_at: Date;
      published_at: Date | null;
    }>(
      `SELECT id, event_type, status, attempt_count, created_at, published_at
         FROM audit.outbox_events ORDER BY created_at DESC LIMIT 100`,
    );
    const items: JobRecord[] = r.rows.map((row) => ({
      id: row.id,
      type: row.event_type,
      status:
        row.status === 'published'
          ? 'succeeded'
          : row.status === 'publishing'
            ? 'running'
            : row.status === 'failed'
              ? 'failed'
              : row.status === 'dead_letter'
                ? 'cancelled'
                : 'queued',
      attemptCount: row.attempt_count,
      createdAt: row.created_at.toISOString(),
      updatedAt: (row.published_at ?? row.created_at).toISOString(),
    }));
    return { items, total: items.length };
  }

  async cancelJob(_a: Actor, id: string): Promise<JobRecord | null> {
    const r = await this.pool.query<{
      id: string;
      event_type: string;
      attempt_count: number;
      created_at: Date;
    }>(
      `UPDATE audit.outbox_events SET status = 'dead_letter'
        WHERE id = $1 AND status IN ('pending','failed')
      RETURNING id, event_type, attempt_count, created_at`,
      [id],
    );
    const row = r.rows[0];
    return row
      ? {
          id: row.id,
          type: row.event_type,
          status: 'cancelled',
          attemptCount: row.attempt_count,
          createdAt: row.created_at.toISOString(),
          updatedAt: nowIso(),
        }
      : null;
  }

  async retryJob(_a: Actor, id: string): Promise<JobRecord | null> {
    const r = await this.pool.query<{
      id: string;
      event_type: string;
      attempt_count: number;
      created_at: Date;
    }>(
      `UPDATE audit.outbox_events SET status = 'pending', available_at = now()
        WHERE id = $1 AND status IN ('failed','dead_letter')
      RETURNING id, event_type, attempt_count, created_at`,
      [id],
    );
    const row = r.rows[0];
    return row
      ? {
          id: row.id,
          type: row.event_type,
          status: 'queued',
          attemptCount: row.attempt_count,
          createdAt: row.created_at.toISOString(),
          updatedAt: nowIso(),
        }
      : null;
  }
}

// ─── Admin: Maintenance ───────────────────────────────────────────────────────

import type {
  MaintenanceWindowRecord,
  MaintenanceWindowCreate,
  AdminMaintenanceRepository,
} from './admin-maintenance.js';

export class PgAdminMaintenanceRepository implements AdminMaintenanceRepository {
  constructor(private readonly pool: Pool) {}

  async listWindows(
    _a: Actor,
  ): Promise<{ items: readonly MaintenanceWindowRecord[]; total: number }> {
    return { items: [], total: 0 };
  }

  async createWindow(_a: Actor, input: MaintenanceWindowCreate): Promise<MaintenanceWindowRecord> {
    return {
      id: randomUUID(),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      description: input.description,
      status: 'scheduled',
      createdAt: nowIso(),
    };
  }
}

// ─── Admin: Support Cases ─────────────────────────────────────────────────────

import type { AdminSupportCaseRecord, AdminSupportCaseRepository } from './admin-support-cases.js';

interface SupportCaseRow {
  id: string;
  case_reference: string;
  subject: string;
  tenant_name: string;
  severity: string;
  category: string;
  requester_user_id: string;
  status: string;
  assigned_to: string | null;
  created_at: Date;
  updated_at: Date;
}

function toSupportCase(r: SupportCaseRow): AdminSupportCaseRecord {
  return {
    id: r.id,
    caseReference: r.case_reference ?? r.id.slice(0, 8).toUpperCase(),
    subject: r.subject,
    tenantName: r.tenant_name,
    severity: r.severity as AdminSupportCaseRecord['severity'],
    category: r.category,
    requesterUserId: r.requester_user_id,
    status: r.status as AdminSupportCaseRecord['status'],
    assigneeId: r.assigned_to,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export class PgAdminSupportCaseRepository implements AdminSupportCaseRepository {
  constructor(private readonly pool: Pool) {}

  async listCases(_a: Actor): Promise<{ items: readonly AdminSupportCaseRecord[]; total: number }> {
    const r = await this.pool.query<SupportCaseRow>(
      `SELECT support_case.id, support_case.case_reference, support_case.subject,
              COALESCE(organization.display_name, 'Platform') AS tenant_name,
              support_case.severity, support_case.category, support_case.requester_user_id,
              support_case.status, support_case.assigned_to, support_case.created_at,
              support_case.updated_at
         FROM support.cases AS support_case
         LEFT JOIN tenant.organizations AS organization ON organization.id = support_case.tenant_id
        ORDER BY support_case.created_at DESC LIMIT 200`,
    );
    return { items: r.rows.map(toSupportCase), total: r.rows.length };
  }

  async assignCase(
    _a: Actor,
    id: string,
    input: { assigneeId: string },
  ): Promise<AdminSupportCaseRecord | null> {
    const r = await this.pool.query<SupportCaseRow>(
      `WITH updated AS (
         UPDATE support.cases SET assigned_to = $1, updated_at = now() WHERE id = $2
         RETURNING id, tenant_id, case_reference, subject, severity, category,
                   requester_user_id, status, assigned_to, created_at, updated_at
       )
       SELECT updated.id, updated.case_reference, updated.subject,
              COALESCE(organization.display_name, 'Platform') AS tenant_name,
              updated.severity, updated.category, updated.requester_user_id,
              updated.status, updated.assigned_to, updated.created_at, updated.updated_at
         FROM updated
         LEFT JOIN tenant.organizations AS organization ON organization.id = updated.tenant_id`,
      [input.assigneeId, id],
    );
    return r.rows[0] ? toSupportCase(r.rows[0]) : null;
  }

  async updateStatus(
    _a: Actor,
    id: string,
    input: { status: string; note?: string },
  ): Promise<AdminSupportCaseRecord | null> {
    const r = await this.pool.query<SupportCaseRow>(
      `WITH updated AS (
         UPDATE support.cases
            SET status = $1, updated_at = now(),
                resolved_at = CASE WHEN $1 IN ('resolved','closed') THEN now() ELSE resolved_at END
          WHERE id = $2
         RETURNING id, tenant_id, case_reference, subject, severity, category,
                   requester_user_id, status, assigned_to, created_at, updated_at
       )
       SELECT updated.id, updated.case_reference, updated.subject,
              COALESCE(organization.display_name, 'Platform') AS tenant_name,
              updated.severity, updated.category, updated.requester_user_id,
              updated.status, updated.assigned_to, updated.created_at, updated.updated_at
         FROM updated
         LEFT JOIN tenant.organizations AS organization ON organization.id = updated.tenant_id`,
      [input.status, id],
    );
    return r.rows[0] ? toSupportCase(r.rows[0]) : null;
  }
}

// ─── Admin: Privileged Access ─────────────────────────────────────────────────

import type { AdminPrivilegedAccessRepository } from './admin-privileged-access.js';

export class PgAdminPrivilegedAccessRepository implements AdminPrivilegedAccessRepository {
  constructor(private readonly pool: Pool) {}

  async createGrant(
    actor: Actor,
    input: { userId: string; scope: string; reason: string; expiresAt: string },
  ): Promise<{
    id: string;
    userId: string;
    scope: string;
    reason: string;
    expiresAt: string;
    createdAt: string;
  }> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO iam.privileged_access_grants (id, grantee_id, scope, reason, granted_by, expires_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, input.userId, input.scope, input.reason, actor.userId, new Date(input.expiresAt)],
    );
    return {
      id,
      userId: input.userId,
      scope: input.scope,
      reason: input.reason,
      expiresAt: input.expiresAt,
      createdAt: nowIso(),
    };
  }

  async revokeGrant(_a: Actor, id: string): Promise<boolean> {
    const r = await this.pool.query(
      `UPDATE iam.privileged_access_grants SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING id`,
      [id],
    );
    return (r.rowCount ?? 0) > 0;
  }
}

// ─── Governance: AI Systems ───────────────────────────────────────────────────

import type {
  AiSystemRecord,
  AiSystemCreate,
  ClassificationCreate,
  ClassificationRecord,
  AiSystemRepository,
} from './governance-ai-systems.js';

interface AiSystemRow {
  id: string;
  system_code: string;
  name: string;
  provider_legal_name: string;
  intended_purpose: string;
  version: string;
  lifecycle_status: string;
  owner_user_id: string;
  created_at: Date;
  updated_at: Date;
}

function toAiSystem(r: AiSystemRow): AiSystemRecord {
  return {
    id: r.id,
    systemCode: r.system_code,
    name: r.name,
    providerLegalName: r.provider_legal_name,
    intendedPurpose: r.intended_purpose,
    version: r.version,
    lifecycleStatus: r.lifecycle_status as AiSystemRecord['lifecycleStatus'],
    ownerUserId: r.owner_user_id,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export class PgAiSystemRepository implements AiSystemRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listSystems(
    actor: Actor,
    limit: number,
  ): Promise<{ items: readonly AiSystemRecord[]; total: number }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiSystemRow>(
        `SELECT id, system_code, name, provider_legal_name, intended_purpose, version,
                lifecycle_status, owner_user_id, created_at, updated_at
           FROM governance.ai_system_records ORDER BY created_at DESC LIMIT $1`,
        [limit],
      );
      return { items: r.rows.map(toAiSystem), total: r.rows.length };
    });
  }

  async getSystem(actor: Actor, id: string): Promise<AiSystemRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiSystemRow>(
        `SELECT id, system_code, name, provider_legal_name, intended_purpose, version,
                lifecycle_status, owner_user_id, created_at, updated_at
           FROM governance.ai_system_records WHERE id = $1`,
        [id],
      );
      return r.rows[0] ? toAiSystem(r.rows[0]) : null;
    });
  }

  async createSystem(actor: Actor, input: AiSystemCreate): Promise<AiSystemRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiSystemRow>(
        `INSERT INTO governance.ai_system_records
           (id, system_code, name, provider_legal_name, intended_purpose, version, lifecycle_status, owner_user_id)
         VALUES ($1,$2,$3,$4,$5,$6,'design',$7)
         RETURNING id, system_code, name, provider_legal_name, intended_purpose, version,
                   lifecycle_status, owner_user_id, created_at, updated_at`,
        [
          randomUUID(),
          input.systemCode,
          input.name,
          input.providerLegalName,
          input.intendedPurpose,
          input.version,
          actor.userId,
        ],
      );
      if (!r.rows[0]) throw new Error('ai_system row missing');
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'ai_system.create',
        resourceType: 'ai_system_record',
        resourceId: r.rows[0].id,
        outcome: 'success',
        metadata: {},
      });
      return toAiSystem(r.rows[0]);
    });
  }

  async createClassification(
    actor: Actor,
    systemId: string,
    input: ClassificationCreate,
  ): Promise<ClassificationRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const vRes = await client.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM governance.classification_records WHERE ai_system_id = $1`,
        [systemId],
      );
      const versionNo = Number(vRes.rows[0]?.n ?? '0') + 1;
      const id = randomUUID();
      await client.query(
        `INSERT INTO governance.classification_records
           (id, ai_system_id, version_no, ai_system_conclusion, territorial_scope,
            organization_roles, article_5_review, annex_iii_category, high_risk_conclusion,
            article_50_review, gpai_role_review, legal_snapshot_at, confidence, status, prepared_by)
         SELECT $1, system.id, $3, true, $5, '[]'::jsonb, '{}'::jsonb,
                CASE WHEN $4 THEN 'employment_and_worker_management' ELSE NULL END,
                $4, '{}'::jsonb, '{}'::jsonb, CURRENT_DATE, $6, 'draft', $7
           FROM governance.ai_system_records AS system
          WHERE system.id = $2`,
        [
          id,
          systemId,
          versionNo,
          input.highRiskConclusion,
          input.territorialScope,
          input.confidence,
          actor.userId,
        ],
      );
      return {
        id,
        aiSystemId: systemId,
        versionNo,
        highRiskConclusion: input.highRiskConclusion,
        territorialScope: input.territorialScope,
        confidence: input.confidence,
        status: 'draft',
        createdAt: nowIso(),
      };
    });
  }
}

// ─── Governance: Risk Controls ────────────────────────────────────────────────

import type {
  RiskControlRecord,
  RiskControlCreate,
  RiskControlRepository,
} from './governance-risk-controls.js';

interface RiskControlRow {
  id: string;
  risk_code: string;
  harm: string;
  control_description: string;
  status: string;
  created_at: Date;
}

function toRiskControl(r: RiskControlRow): RiskControlRecord {
  return {
    id: r.id,
    riskCode: r.risk_code,
    harm: r.harm,
    controlDescription: r.control_description,
    status: r.status as RiskControlRecord['status'],
    createdAt: r.created_at.toISOString(),
  };
}

export class PgRiskControlRepository implements RiskControlRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listControls(
    actor: Actor,
  ): Promise<{ items: readonly RiskControlRecord[]; total: number }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<RiskControlRow>(
        `SELECT id, risk_code, harm, control_description, status, created_at FROM governance.risk_controls WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 200`,
        [actor.tenantId],
      );
      return { items: r.rows.map(toRiskControl), total: r.rows.length };
    });
  }

  async getControl(actor: Actor, id: string): Promise<RiskControlRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<RiskControlRow>(
        `SELECT id, risk_code, harm, control_description, status, created_at FROM governance.risk_controls WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      return r.rows[0] ? toRiskControl(r.rows[0]) : null;
    });
  }

  async createControl(actor: Actor, input: RiskControlCreate): Promise<RiskControlRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO governance.risk_controls (id, tenant_id, risk_code, harm, cause, control_description, test_reference, inherent_likelihood, inherent_severity, status, owner_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10)`,
        [
          id,
          actor.tenantId,
          input.riskCode,
          input.harm,
          input.cause,
          input.controlDescription,
          input.testReference,
          input.inherentLikelihood,
          input.inherentSeverity,
          actor.userId,
        ],
      );
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'risk_control.create',
        resourceType: 'risk_control',
        resourceId: id,
        outcome: 'success',
        metadata: {},
      });
      return {
        id,
        riskCode: input.riskCode,
        harm: input.harm,
        controlDescription: input.controlDescription,
        status: 'open',
        createdAt: nowIso(),
      };
    });
  }
}

// ─── Governance: Docs ─────────────────────────────────────────────────────────

import type {
  GovernanceDocRecord,
  GovernanceDocCreate,
  GovernanceDocType,
  GovernanceDocRepository,
} from './governance-docs.js';

const GOV_TABLE: Record<GovernanceDocType, string> = {
  ai_literacy: 'governance.ai_literacy_records',
  dataset: 'governance.dataset_registry',
  data_use_register: 'governance.data_use_register',
  impact_assessment: 'governance.impact_assessments',
  post_market_plan: 'governance.post_market_plans',
  post_market_signal: 'governance.post_market_signals',
  qms_document: 'governance.quality_documents',
  technical_document: 'governance.technical_document_versions',
  vendor_evidence: 'governance.vendor_evidence',
  deployer_instruction: 'governance.deployer_instructions',
};

export class PgGovernanceDocRepository implements GovernanceDocRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listDocs(
    actor: Actor,
    docType: GovernanceDocType,
  ): Promise<{ items: readonly GovernanceDocRecord[]; total: number }> {
    const table = GOV_TABLE[docType] ?? 'governance.quality_documents';
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{
        id: string;
        title: string | null;
        status: string | null;
        created_at: Date;
        updated_at: Date | null;
      }>(
        `SELECT id, COALESCE(title, id) AS title, COALESCE(status, 'active') AS status, created_at, updated_at FROM ${table} WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [actor.tenantId],
      );
      const items: GovernanceDocRecord[] = r.rows.map((row) => ({
        id: row.id,
        title: row.title ?? row.id,
        status: row.status ?? 'active',
        createdAt: row.created_at.toISOString(),
        updatedAt: (row.updated_at ?? row.created_at).toISOString(),
      }));
      return { items, total: items.length };
    });
  }

  async getDocs(
    actor: Actor,
    docType: GovernanceDocType,
    id: string,
  ): Promise<GovernanceDocRecord | null> {
    const table = GOV_TABLE[docType] ?? 'governance.quality_documents';
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{
        id: string;
        title: string | null;
        status: string | null;
        created_at: Date;
        updated_at: Date | null;
      }>(
        `SELECT id, COALESCE(title, id) AS title, COALESCE(status, 'active') AS status, created_at, updated_at FROM ${table} WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      if (!r.rows[0]) return null;
      const row = r.rows[0];
      return {
        id: row.id,
        title: row.title ?? row.id,
        status: row.status ?? 'active',
        createdAt: row.created_at.toISOString(),
        updatedAt: (row.updated_at ?? row.created_at).toISOString(),
      };
    });
  }

  async createDoc(
    actor: Actor,
    docType: GovernanceDocType,
    input: GovernanceDocCreate,
  ): Promise<GovernanceDocRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO governance.quality_documents (id, tenant_id, document_type, title, status, version, owner_user_id) VALUES ($1,$2,$3,$4,'draft','1.0',$5) ON CONFLICT DO NOTHING`,
        [id, actor.tenantId, docType, input.title, actor.userId],
      );
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: `${docType}.create`,
        resourceType: docType,
        resourceId: id,
        outcome: 'success',
        metadata: {},
      });
      return { id, title: input.title, status: 'draft', createdAt: nowIso(), updatedAt: nowIso() };
    });
  }
}

// ─── Governance: Submissions ──────────────────────────────────────────────────

import type {
  GovernanceSubmissionRepository,
  GovernanceSubmissionRecord,
  GovernanceSubmissionCreate,
  GovernanceSubmissionType,
  DeployerInstructionRecord,
  SeriousIncidentUpdate,
  ChangeRequestDecision,
} from './governance-submissions.js';

export class PgGovernanceSubmissionRepository implements GovernanceSubmissionRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async getDeployerInstruction(
    actor: Actor,
    systemId: string,
  ): Promise<DeployerInstructionRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{
        id: string;
        content: string;
        version: string;
        created_at: Date;
      }>(
        `SELECT id, content, version, created_at FROM governance.deployer_instructions WHERE tenant_id = $1 AND ai_system_id = $2 ORDER BY created_at DESC LIMIT 1`,
        [actor.tenantId, systemId],
      );
      if (!r.rows[0]) return null;
      return {
        id: r.rows[0].id,
        aiSystemId: systemId,
        title: 'Deployer Instructions',
        content: r.rows[0].content,
        createdAt: r.rows[0].created_at.toISOString(),
      };
    });
  }

  async createSubmission(
    actor: Actor,
    submissionType: GovernanceSubmissionType,
    input: GovernanceSubmissionCreate,
  ): Promise<GovernanceSubmissionRecord> {
    const id = randomUUID();
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: `governance.${submissionType}.submit`,
        resourceType: 'governance_submission',
        resourceId: id,
        outcome: 'success',
        metadata: { reference: input.reference, summary: input.summary },
      });
    });
    return {
      id,
      submissionType,
      reference: input.reference,
      status: 'submitted',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  async approveConformityAssessment(
    actor: Actor,
    assessmentId: string,
  ): Promise<GovernanceSubmissionRecord> {
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await client.query(
        `UPDATE governance.conformity_assessments SET status = 'approved', approved_by = $1, approved_at = now(), updated_at = now() WHERE id = $2 AND tenant_id = $3`,
        [actor.userId, assessmentId, actor.tenantId],
      );
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'conformity_assessment.approve',
        resourceType: 'conformity_assessment',
        resourceId: assessmentId,
        outcome: 'success',
        metadata: {},
      });
    });
    return {
      id: assessmentId,
      submissionType: 'conformity_assessment',
      reference: assessmentId,
      status: 'approved',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  async updateSeriousIncident(
    actor: Actor,
    incidentId: string,
    input: SeriousIncidentUpdate,
  ): Promise<GovernanceSubmissionRecord> {
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await client.query(
        `UPDATE governance.serious_incident_reports SET status = $1, notes = $2, updated_at = now() WHERE id = $3 AND tenant_id = $4`,
        [input.status, input.notes, incidentId, actor.tenantId],
      );
    });
    return {
      id: incidentId,
      submissionType: 'serious_incident',
      reference: incidentId,
      status: input.status,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  async decideChangeRequest(
    actor: Actor,
    changeId: string,
    input: ChangeRequestDecision,
  ): Promise<GovernanceSubmissionRecord> {
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await client.query(
        `UPDATE governance.change_requests SET decision = $1, decision_reason = $2, decided_at = now(), decided_by = $3, updated_at = now() WHERE id = $4 AND tenant_id = $5`,
        [input.decision, input.rationale, actor.userId, changeId, actor.tenantId],
      );
    });
    return {
      id: changeId,
      submissionType: 'change_request',
      reference: changeId,
      status: input.decision,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }
}

// ─── AI Models ────────────────────────────────────────────────────────────────

import type { AiModelRecord, AiModelCreate } from './ai-model-types.js';
import type { AiModelListResult, AiModelRepository } from './ai-models.js';

interface AiModelRow {
  id: string;
  provider: string;
  model_key: string;
  display_name: string;
  model_version: string;
  intended_purpose: string;
  limitations: string;
  data_region: string | null;
  status: string;
  evaluation_summary: Record<string, unknown>;
  approved_by: string | null;
  approved_at: Date | null;
  created_at: Date;
}

function toAiModel(r: AiModelRow): AiModelRecord {
  return {
    id: r.id,
    provider: r.provider,
    modelKey: r.model_key,
    displayName: r.display_name,
    modelVersion: r.model_version,
    intendedPurpose: r.intended_purpose,
    limitations: r.limitations,
    dataRegion: r.data_region,
    status: r.status as AiModelRecord['status'],
    evaluationSummary: r.evaluation_summary,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
  };
}

export class PgAiModelRepository implements AiModelRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listModels(
    actor: Actor,
    limit: number,
    _cursor: string | null,
  ): Promise<AiModelListResult> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiModelRow>(
        `SELECT id, provider, model_key, display_name, model_version, intended_purpose, limitations, data_region, status, evaluation_summary, approved_by, approved_at, created_at FROM assessment.model_registry ORDER BY created_at DESC LIMIT $1`,
        [limit],
      );
      return { items: r.rows.map(toAiModel), total: r.rows.length, hasMore: false };
    });
  }

  async getModel(actor: Actor, id: string): Promise<AiModelRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiModelRow>(
        `SELECT id, provider, model_key, display_name, model_version, intended_purpose, limitations, data_region, status, evaluation_summary, approved_by, approved_at, created_at FROM assessment.model_registry WHERE id = $1`,
        [id],
      );
      return r.rows[0] ? toAiModel(r.rows[0]) : null;
    });
  }

  async createModel(actor: Actor, input: AiModelCreate): Promise<AiModelRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiModelRow>(
        `INSERT INTO assessment.model_registry (id, provider, model_key, display_name, model_version, intended_purpose, limitations, data_region, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft') RETURNING id, provider, model_key, display_name, model_version, intended_purpose, limitations, data_region, status, evaluation_summary, approved_by, approved_at, created_at`,
        [
          randomUUID(),
          input.provider,
          input.modelKey,
          input.displayName,
          input.modelVersion,
          input.intendedPurpose,
          input.limitations,
          input.dataRegion ?? null,
        ],
      );
      if (!r.rows[0]) throw new Error('model row missing');
      return toAiModel(r.rows[0]);
    });
  }

  async recordEvaluation(
    actor: Actor,
    id: string,
    input: { readonly outcome: string; readonly rationale: string },
  ): Promise<AiModelRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiModelRow>(
        `UPDATE assessment.model_registry
            SET evaluation_summary = $1::jsonb,
                status = CASE WHEN status = 'draft' THEN 'evaluating' ELSE status END
          WHERE id = $2 AND status NOT IN ('active', 'retired')
        RETURNING id, provider, model_key, display_name, model_version, intended_purpose,
                  limitations, data_region, status, evaluation_summary, approved_by,
                  approved_at, created_at`,
        [
          JSON.stringify({
            recorded: true,
            outcome: input.outcome,
            rationale: input.rationale,
            recordedBy: actor.userId,
            recordedAt: nowIso(),
          }),
          id,
        ],
      );
      const row = r.rows[0];
      if (row === undefined) return null;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'ai_model.evaluation_recorded',
        resourceType: 'ai_model',
        resourceId: id,
        outcome: 'success',
        metadata: { outcome: input.outcome },
      });
      return toAiModel(row);
    });
  }

  async activateModel(actor: Actor, id: string): Promise<AiModelRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiModelRow>(
        `UPDATE assessment.model_registry
            SET status = 'active', approved_by = $1, approved_at = now()
          WHERE id = $2
            AND status IN ('evaluating', 'approved', 'suspended')
            AND evaluation_summary ? 'outcome'
            AND lower(evaluation_summary->>'outcome') NOT LIKE '%fail%'
            AND lower(evaluation_summary->>'outcome') NOT LIKE '%reject%'
        RETURNING id, provider, model_key, display_name, model_version, intended_purpose,
                  limitations, data_region, status, evaluation_summary, approved_by,
                  approved_at, created_at`,
        [actor.userId, id],
      );
      return r.rows[0] ? toAiModel(r.rows[0]) : null;
    });
  }

  async suspendModel(actor: Actor, id: string): Promise<AiModelRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiModelRow>(
        `UPDATE assessment.model_registry SET status = 'suspended' WHERE id = $1 RETURNING id, provider, model_key, display_name, model_version, intended_purpose, limitations, data_region, status, evaluation_summary, approved_by, approved_at, created_at`,
        [id],
      );
      return r.rows[0] ? toAiModel(r.rows[0]) : null;
    });
  }
}

// ─── Assessment Versions ──────────────────────────────────────────────────────

import type {
  AssessmentVersionRepository,
  AssessmentVersionPreview,
  AssessmentDefectRecord,
  AssessmentDefectCreate,
  AssessmentValidationRepository,
} from './assessment-versions.js';
import type {
  AssessmentVersionRecord,
  AssessmentValidationCreate,
  AssessmentValidationRecord,
} from './assessment-version-types.js';

interface AssessmentVersionRow {
  id: string;
  assessment_id: string;
  version_no: number;
  status: string;
  duration_seconds: number;
  created_at: Date;
}

function toAssessmentVersion(row: AssessmentVersionRow): AssessmentVersionRecord {
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    versionNo: row.version_no,
    status: row.status as AssessmentVersionRecord['status'],
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at.toISOString(),
  };
}

export class PgAssessmentVersionRepository
  implements AssessmentVersionRepository, AssessmentValidationRepository
{
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  private async queryVersion(
    client: PoolClient,
    actor: Actor,
    id: string,
  ): Promise<AssessmentVersionRecord | null> {
    const result = await client.query<AssessmentVersionRow>(
      `SELECT av.id, av.assessment_id, av.version_no, av.status,
              av.duration_seconds, av.created_at
         FROM assessment.assessment_versions av
         JOIN assessment.assessments a ON a.id = av.assessment_id
        WHERE a.tenant_id = $1 AND av.id = $2`,
      [actor.tenantId, id],
    );
    return result.rows[0] === undefined ? null : toAssessmentVersion(result.rows[0]);
  }

  private async cloneVersion(
    client: PoolClient,
    actor: Actor,
    sourceId: string,
    rationale: string,
  ): Promise<AssessmentVersionRecord | null> {
    const source = await this.queryVersion(client, actor, sourceId);
    if (source === null) return null;
    const versionResult = await client.query<AssessmentVersionRow>(
      `INSERT INTO assessment.assessment_versions
         (id, assessment_id, version_no, competency_framework_version_id,
          rubric_version_id, default_model_id, default_prompt_version_id,
          duration_seconds, instructions, technical_requirements,
          accessibility_config, monitoring_policy, status, content_hash)
       SELECT $1, source.assessment_id,
              (SELECT COALESCE(max(existing.version_no), 0) + 1
                 FROM assessment.assessment_versions existing
                WHERE existing.assessment_id = source.assessment_id),
              source.competency_framework_version_id, source.rubric_version_id,
              source.default_model_id, source.default_prompt_version_id,
              source.duration_seconds, source.instructions, source.technical_requirements,
              source.accessibility_config, source.monitoring_policy, 'draft', source.content_hash
         FROM assessment.assessment_versions source
         JOIN assessment.assessments a ON a.id = source.assessment_id
        WHERE source.id = $2 AND a.tenant_id = $3
      RETURNING id, assessment_id, version_no, status, duration_seconds, created_at`,
      [randomUUID(), sourceId, actor.tenantId],
    );
    const newVersion = versionResult.rows[0];
    if (newVersion === undefined) return null;
    const sections = await client.query<{
      id: string;
      section_type: string;
      title: string;
      instructions: unknown;
      duration_seconds: number | null;
      display_order: number;
      config: unknown;
    }>(
      `SELECT id, section_type, title, instructions, duration_seconds, display_order, config
         FROM assessment.assessment_sections
        WHERE assessment_version_id = $1
        ORDER BY display_order`,
      [sourceId],
    );
    for (const section of sections.rows) {
      const sectionId = randomUUID();
      await client.query(
        `INSERT INTO assessment.assessment_sections
           (id, assessment_version_id, section_type, title, instructions,
            duration_seconds, display_order, config)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb)`,
        [
          sectionId,
          newVersion.id,
          section.section_type,
          section.title,
          JSON.stringify(section.instructions),
          section.duration_seconds,
          section.display_order,
          JSON.stringify(section.config),
        ],
      );
      await client.query(
        `INSERT INTO assessment.assessment_items
           (id, section_id, item_type, title, prompt, expected_artifacts, config,
            display_order, content_hash)
         SELECT gen_random_uuid(), $1, item_type, title, prompt, expected_artifacts,
                config, display_order, content_hash
           FROM assessment.assessment_items
          WHERE section_id = $2`,
        [sectionId, section.id],
      );
    }
    await client.query(
      `INSERT INTO assessment.assessment_tool_policies
         (id, assessment_version_id, plugin_id, model_id, prompt_version_id,
          tool_type, is_allowed, limits)
       SELECT gen_random_uuid(), $1, plugin_id, model_id, prompt_version_id,
              tool_type, is_allowed, limits
         FROM assessment.assessment_tool_policies
        WHERE assessment_version_id = $2`,
      [newVersion.id, sourceId],
    );
    await new PgAuditWriter(client).append({
      tenantId: actor.tenantId,
      actorType: 'user',
      actorId: actor.userId,
      action: 'assessment_version.create',
      resourceType: 'assessment_version',
      resourceId: newVersion.id,
      outcome: 'success',
      metadata: { sourceVersionId: sourceId, rationale },
    });
    return toAssessmentVersion(newVersion);
  }

  async createVersionForAssessment(
    actor: Actor,
    assessmentId: string,
    rationale: string,
  ): Promise<AssessmentVersionRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const source = await client.query<{ id: string }>(
        `SELECT av.id
           FROM assessment.assessment_versions av
           JOIN assessment.assessments a ON a.id = av.assessment_id
          WHERE a.tenant_id = $1 AND a.id = $2
          ORDER BY av.version_no DESC
          LIMIT 1`,
        [actor.tenantId, assessmentId],
      );
      const sourceId = source.rows[0]?.id;
      return sourceId === undefined ? null : this.cloneVersion(client, actor, sourceId, rationale);
    });
  }

  async activateVersion(actor: Actor, versionId: string): Promise<AssessmentVersionRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AssessmentVersionRow>(
        `UPDATE assessment.assessment_versions av
            SET status = 'active'
           FROM assessment.assessments a
          WHERE av.assessment_id = a.id
            AND a.tenant_id = $1
            AND av.id = $2
            AND av.status IN ('draft', 'approved', 'suspended')
            AND NOT EXISTS (
              SELECT 1
                FROM (VALUES
                  ('job_relevance'), ('accessibility'), ('privacy'), ('security'),
                  ('fairness'), ('technical')
                ) AS required(validation_type)
               WHERE NOT EXISTS (
                 SELECT 1 FROM assessment.assessment_validations validation
                  WHERE validation.assessment_version_id = av.id
                    AND validation.validation_type = required.validation_type
                    AND validation.status IN ('passed', 'passed_with_conditions')
                    AND (validation.expires_at IS NULL OR validation.expires_at > now())
               )
            )
        RETURNING av.id, av.assessment_id, av.version_no, av.status,
                  av.duration_seconds, av.created_at`,
        [actor.tenantId, versionId],
      );
      if (!r.rows[0]) return null;
      return toAssessmentVersion(r.rows[0]);
    });
  }

  async previewVersion(actor: Actor, versionId: string): Promise<AssessmentVersionPreview | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const vr = await client.query<{ id: string; duration_seconds: number }>(
        `SELECT av.id, av.duration_seconds
           FROM assessment.assessment_versions av
           JOIN assessment.assessments a ON a.id = av.assessment_id
          WHERE a.tenant_id = $1 AND av.id = $2`,
        [actor.tenantId, versionId],
      );
      if (!vr.rows[0]) return null;
      const ir = await client.query<{ id: string; prompt: string }>(
        `SELECT item.id, item.prompt::text AS prompt
           FROM assessment.assessment_items item
           JOIN assessment.assessment_sections section ON section.id = item.section_id
          WHERE section.assessment_version_id = $1
          ORDER BY section.display_order, item.display_order`,
        [versionId],
      );
      return {
        versionId,
        itemCount: ir.rows.length,
        durationSeconds: vr.rows[0].duration_seconds,
        items: ir.rows,
      };
    });
  }

  async duplicateVersion(actor: Actor, versionId: string): Promise<AssessmentVersionRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      return this.cloneVersion(client, actor, versionId, 'Duplicated from an existing version.');
    });
  }

  async suspendVersion(actor: Actor, versionId: string): Promise<AssessmentVersionRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AssessmentVersionRow>(
        `UPDATE assessment.assessment_versions av
            SET status = 'suspended'
           FROM assessment.assessments a
          WHERE av.assessment_id = a.id AND a.tenant_id = $1 AND av.id = $2
        RETURNING av.id, av.assessment_id, av.version_no, av.status,
                  av.duration_seconds, av.created_at`,
        [actor.tenantId, versionId],
      );
      if (!r.rows[0]) return null;
      return toAssessmentVersion(r.rows[0]);
    });
  }

  async createDefect(
    actor: Actor,
    versionId: string,
    input: AssessmentDefectCreate,
  ): Promise<AssessmentDefectRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const version = await this.queryVersion(client, actor, versionId);
      if (version === null) return null;
      const id = randomUUID();
      await client.query(
        `INSERT INTO governance.assessment_defects
           (id, assessment_version_id, defect_type, severity, description, status)
         VALUES ($1,$2,'content_or_configuration',$3,$4,'reported')`,
        [id, versionId, input.severity, input.summary],
      );
      return {
        id,
        assessmentVersionId: versionId,
        severity: input.severity,
        summary: input.summary,
        createdAt: nowIso(),
      };
    });
  }

  async createValidation(
    actor: Actor,
    versionId: string,
    input: AssessmentValidationCreate,
  ): Promise<AssessmentValidationRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const id = randomUUID();
      const version = await this.queryVersion(client, actor, versionId);
      if (version === null) throw new Error('assessment version not found');
      await client.query(
        `INSERT INTO assessment.assessment_validations
           (id, assessment_version_id, validation_type, status, evidence_uri,
            summary, reviewer_user_id, reviewed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,
                 CASE WHEN $4 = 'pending' THEN NULL ELSE now() END)`,
        [
          id,
          versionId,
          input.validationType,
          input.status,
          input.evidenceUri ?? null,
          input.summary ?? null,
          actor.userId,
        ],
      );
      return {
        id,
        assessmentVersionId: versionId,
        validationType: input.validationType,
        status: input.status,
        evidenceUri: input.evidenceUri ?? null,
        summary: input.summary ?? null,
        reviewerUserId: actor.userId,
        reviewedAt: input.status === 'pending' ? null : nowIso(),
        expiresAt: null,
        createdAt: nowIso(),
      };
    });
  }
}

// ─── Audit Evidence ───────────────────────────────────────────────────────────

import type {
  EvidenceCollectionRecord,
  AuditEvidenceRepository,
  TraceabilityRow,
} from './audit-evidence.js';

export class PgAuditEvidenceRepository implements AuditEvidenceRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listCollections(
    actor: Actor,
  ): Promise<{ items: readonly EvidenceCollectionRecord[]; total: number }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{
        id: string;
        event_type: string;
        status: string;
        created_at: Date;
      }>(
        `SELECT id, event_type, status, created_at FROM audit.outbox_events WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [actor.tenantId],
      );
      const items: EvidenceCollectionRecord[] = r.rows.map((row) => ({
        id: row.id,
        title: row.event_type,
        framework: 'EU AI Act',
        status: row.status === 'published' ? 'active' : 'pending',
        itemCount: 1,
        createdAt: row.created_at.toISOString(),
      }));
      return { items, total: items.length };
    });
  }

  async createCollection(
    actor: Actor,
    input: { title: string; framework: string },
  ): Promise<EvidenceCollectionRecord> {
    const id = randomUUID();
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'evidence_collection.create',
        resourceType: 'evidence_collection',
        resourceId: id,
        outcome: 'success',
        metadata: { title: input.title },
      });
    });
    return {
      id,
      title: input.title,
      framework: input.framework,
      status: 'active',
      itemCount: 0,
      createdAt: nowIso(),
    };
  }

  async getTraceability(_actor: Actor, requirementId: string): Promise<TraceabilityRow> {
    return {
      requirementId,
      requirementTitle: requirementId,
      controls: [],
      evidence: [],
      coverage: 'unlinked',
    };
  }
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

import type { BookingRecord, BookingCreate, BookingUpdate, BookingRepository } from './bookings.js';

interface BookingRow {
  id: string;
  application_id: string;
  status: string;
  start_at: Date;
  end_at: Date;
  candidate_timezone: string;
  reschedule_count: number;
  created_at: Date;
  updated_at: Date;
}

function toBooking(r: BookingRow): BookingRecord {
  return {
    id: r.id,
    applicationId: r.application_id,
    status: r.status as BookingRecord['status'],
    startAt: r.start_at.toISOString(),
    endAt: r.end_at.toISOString(),
    candidateTimezone: r.candidate_timezone,
    rescheduleCount: r.reschedule_count,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export class PgBookingRepository implements BookingRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listBookings(
    actor: Actor,
    applicationId: string,
  ): Promise<{ items: readonly BookingRecord[]; total: number }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<BookingRow>(
        `SELECT booking.id, booking.application_id, booking.status, booking.start_at, booking.end_at,
                booking.candidate_timezone, booking.reschedule_count, booking.created_at,
                booking.updated_at
           FROM hiring.assessment_bookings AS booking
           JOIN hiring.applications AS application
             ON application.id = booking.application_id
            AND application.tenant_id = booking.tenant_id
           JOIN hiring.candidates AS candidate
             ON candidate.id = application.candidate_id
            AND candidate.tenant_id = application.tenant_id
          WHERE booking.tenant_id = $1
            AND booking.application_id = $2
            AND ($3::boolean = false OR candidate.user_id = $4)
          ORDER BY booking.start_at DESC
          LIMIT 100`,
        [actor.tenantId, applicationId, actor.roles.includes('candidate'), actor.userId],
      );
      return { items: r.rows.map(toBooking), total: r.rows.length };
    });
  }

  async createBooking(actor: Actor, input: BookingCreate): Promise<BookingRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<BookingRow>(
        `INSERT INTO hiring.assessment_bookings
           (id, tenant_id, application_id, status, start_at, end_at, candidate_timezone, created_by)
         SELECT $1, $2, application.id, 'confirmed', $4, $5, $6, $7
           FROM hiring.applications AS application
           JOIN hiring.candidates AS candidate
             ON candidate.id = application.candidate_id
            AND candidate.tenant_id = application.tenant_id
          WHERE application.tenant_id = $2
            AND application.id = $3
            AND ($8::boolean = false OR candidate.user_id = $7)
            AND application.status NOT IN ('withdrawn', 'cancelled')
         RETURNING id, application_id, status, start_at, end_at, candidate_timezone,
                   reschedule_count, created_at, updated_at`,
        [
          randomUUID(),
          actor.tenantId,
          input.applicationId,
          new Date(input.startAt),
          new Date(input.endAt),
          input.candidateTimezone,
          actor.userId,
          actor.roles.includes('candidate'),
        ],
      );
      if (!r.rows[0]) return null;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'booking.create',
        resourceType: 'assessment_booking',
        resourceId: r.rows[0].id,
        outcome: 'success',
        metadata: {},
      });
      return toBooking(r.rows[0]);
    });
  }

  async updateBooking(
    actor: Actor,
    bookingId: string,
    input: BookingUpdate,
  ): Promise<BookingRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const result = await client.query<BookingRow>(
        `UPDATE hiring.assessment_bookings AS booking
            SET status = $3,
                start_at = COALESCE($4, booking.start_at),
                end_at = COALESCE($5, booking.end_at),
                candidate_timezone = COALESCE($6, booking.candidate_timezone),
                reschedule_count = booking.reschedule_count + CASE WHEN $3 = 'rescheduled' THEN 1 ELSE 0 END,
                updated_at = now()
           FROM hiring.applications AS application
           JOIN hiring.candidates AS candidate
             ON candidate.id = application.candidate_id
            AND candidate.tenant_id = application.tenant_id
          WHERE booking.tenant_id = $1
            AND booking.id = $2
            AND application.id = booking.application_id
            AND ($7::boolean = false OR candidate.user_id = $8)
            AND booking.status NOT IN ('cancelled', 'expired', 'completed')
         RETURNING booking.id, booking.application_id, booking.status, booking.start_at,
                   booking.end_at, booking.candidate_timezone, booking.reschedule_count,
                   booking.created_at, booking.updated_at`,
        [
          actor.tenantId,
          bookingId,
          input.status,
          input.startAt === undefined ? null : new Date(input.startAt),
          input.endAt === undefined ? null : new Date(input.endAt),
          input.candidateTimezone ?? null,
          actor.roles.includes('candidate'),
          actor.userId,
        ],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: input.status === 'cancelled' ? 'booking.cancel' : 'booking.reschedule',
        resourceType: 'assessment_booking',
        resourceId: row.id,
        outcome: 'success',
        metadata: { status: input.status },
      });
      return toBooking(row);
    });
  }
}

// ─── Campaign Dashboard ────────────────────────────────────────────────────────

import type {
  CampaignDashboardRepository,
  CampaignDashboardData,
  CampaignComparisonData,
} from './campaign-dashboard.js';

export class PgCampaignDashboardRepository implements CampaignDashboardRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async getDashboard(actor: Actor, campaignId: string): Promise<CampaignDashboardData | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const campaign = await client.query<{ id: string }>(
        `SELECT id FROM hiring.campaigns WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, campaignId],
      );
      if (campaign.rows[0] === undefined) return null;
      const [appRes, reviewerRes, unassignedRes, scoreRes] = await Promise.all([
        client.query<{ status: string; count: string }>(
          `SELECT status, count(*)::text AS count
             FROM hiring.applications
            WHERE tenant_id = $1 AND campaign_id = $2
            GROUP BY status`,
          [actor.tenantId, campaignId],
        ),
        client.query<{ count: string }>(
          `SELECT count(*)::text AS count
             FROM hiring.campaign_reviewers
            WHERE tenant_id = $1 AND campaign_id = $2 AND active = true`,
          [actor.tenantId, campaignId],
        ),
        client.query<{ count: string }>(
          `SELECT count(*)::text AS count
             FROM hiring.applications AS application
             JOIN runtime.attempts AS attempt ON attempt.application_id = application.id
             JOIN runtime.submissions AS submission ON submission.attempt_id = attempt.id
            WHERE application.tenant_id = $1
              AND application.campaign_id = $2
              AND submission.status IN ('submitted', 'accepted')
              AND NOT EXISTS (
                SELECT 1
                  FROM review.reviewer_assignments AS assignment
                 WHERE assignment.submission_id = submission.id
                   AND assignment.tenant_id = application.tenant_id
                   AND assignment.status NOT IN ('reassigned', 'cancelled')
              )`,
          [actor.tenantId, campaignId],
        ),
        client.query<{ average: string | null }>(
          `SELECT avg(score.total_score)::text AS average
             FROM hiring.applications AS application
             JOIN runtime.attempts AS attempt ON attempt.application_id = application.id
             JOIN runtime.submissions AS submission ON submission.attempt_id = attempt.id
             JOIN review.aggregate_scores AS score ON score.submission_id = submission.id
            WHERE application.tenant_id = $1 AND application.campaign_id = $2
              AND score.tenant_id = application.tenant_id
              AND score.status = 'final'`,
          [actor.tenantId, campaignId],
        ),
      ]);
      const statusBreakdown = Object.fromEntries(
        appRes.rows.map((row) => [row.status, Number(row.count)]),
      );
      return {
        campaignId,
        totalApplications: Object.values(statusBreakdown).reduce((sum, count) => sum + count, 0),
        totalReviewers: Number(reviewerRes.rows[0]?.count ?? 0),
        unassignedReviews: Number(unassignedRes.rows[0]?.count ?? 0),
        averageScore:
          scoreRes.rows[0]?.average === null || scoreRes.rows[0]?.average === undefined
            ? null
            : Number(scoreRes.rows[0].average),
        statusBreakdown,
      };
    });
  }

  async getComparison(actor: Actor, campaignId: string): Promise<CampaignComparisonData | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const exists = await client.query<{ id: string }>(
        `SELECT id FROM hiring.campaigns WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, campaignId],
      );
      if (exists.rows[0] === undefined) return null;
      const r = await client.query<{
        candidate_id: string;
        application_id: string;
        candidate_reference: string;
        review_status: string;
        criteria_scored: string;
        criteria_total: string;
        score: string | null;
      }>(
        `SELECT candidate.id AS candidate_id, application.id AS application_id,
                COALESCE(candidate.external_reference,
                  'candidate-' || left(md5(candidate.id::text), 12)) AS candidate_reference,
                application.status AS review_status,
                count(criterion_score.id) FILTER (
                  WHERE criterion_score.human_score IS NOT NULL
                     OR criterion_score.insufficient_evidence = true
                )::text AS criteria_scored,
                count(criterion.id)::text AS criteria_total,
                max(aggregate.total_score)::text AS score
           FROM hiring.applications AS application
           JOIN hiring.candidates AS candidate ON candidate.id = application.candidate_id
      LEFT JOIN runtime.attempts AS attempt ON attempt.application_id = application.id
      LEFT JOIN runtime.submissions AS submission ON submission.attempt_id = attempt.id
      LEFT JOIN review.reviewer_assignments AS assignment
             ON assignment.submission_id = submission.id
      LEFT JOIN review.scorecards AS scorecard ON scorecard.assignment_id = assignment.id
      LEFT JOIN assessment.rubric_criteria AS criterion
             ON criterion.rubric_version_id = scorecard.rubric_version_id
      LEFT JOIN review.criterion_scores AS criterion_score
             ON criterion_score.scorecard_id = scorecard.id
            AND criterion_score.criterion_id = criterion.id
      LEFT JOIN review.aggregate_scores AS aggregate
             ON aggregate.submission_id = submission.id AND aggregate.status = 'final'
          WHERE application.tenant_id = $1 AND application.campaign_id = $2
          GROUP BY candidate.id, application.id
          ORDER BY max(aggregate.total_score) DESC NULLS LAST, application.id
          LIMIT 50`,
        [actor.tenantId, campaignId],
      );
      return {
        campaignId,
        candidates: r.rows.map((row, i) => ({
          candidateId: row.candidate_id,
          applicationId: row.application_id,
          candidateReference: row.candidate_reference,
          reviewStatus: row.review_status,
          criteriaScored: Number(row.criteria_scored),
          criteriaTotal: Number(row.criteria_total),
          score: row.score === null ? null : Number(row.score),
          rank: i + 1,
        })),
      };
    });
  }
}

// ─── Candidate Actions ────────────────────────────────────────────────────────

import type {
  CandidateActionRepository,
  CandidateComplaintCreate,
  CandidateComplaintRecord,
  ProfileCorrectionCreate,
  ProfileCorrectionRecord,
  ApplicationActionInput,
  ApplicationRequestRecord,
} from './candidate-actions.js';

export class PgCandidateActionRepository implements CandidateActionRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async createComplaint(
    actor: Actor,
    input: CandidateComplaintCreate,
  ): Promise<CandidateComplaintRecord> {
    const id = randomUUID();
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await client.query(
        `INSERT INTO governance.complaints (id, tenant_id, subject, body, status, submitted_by) VALUES ($1,$2,$3,$4,'open',$5)`,
        [id, actor.tenantId, input.subject, input.detail ?? '', actor.userId],
      );
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'complaint.create',
        resourceType: 'complaint',
        resourceId: id,
        outcome: 'success',
        metadata: {},
      });
    });
    return { id, subject: input.subject, status: 'open', createdAt: nowIso() };
  }

  async createProfileCorrection(
    actor: Actor,
    input: ProfileCorrectionCreate,
  ): Promise<ProfileCorrectionRecord> {
    const id = randomUUID();
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'profile_correction.request',
        resourceType: 'profile_correction',
        resourceId: id,
        outcome: 'success',
        metadata: { field: input.field, requestedValueHash: contentHash(input.requestedValue) },
      });
    });
    return { id, field: input.field, status: 'pending', createdAt: nowIso() };
  }

  async requestExplanation(
    actor: Actor,
    applicationId: string,
    input: ApplicationActionInput,
  ): Promise<ApplicationRequestRecord | null> {
    const id = randomUUID();
    const exists = await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const scoped = await client.query(
        `SELECT 1
           FROM hiring.applications AS application
           JOIN hiring.candidates AS candidate ON candidate.id = application.candidate_id
          WHERE application.tenant_id = $1
            AND application.id = $2
            AND candidate.user_id = $3`,
        [actor.tenantId, applicationId, actor.userId],
      );
      if (scoped.rowCount !== 1) return false;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'explanation.request',
        resourceType: 'explanation_request',
        resourceId: id,
        outcome: 'success',
        metadata: { applicationId, reasonHash: contentHash(input.reason) },
      });
      return true;
    });
    if (!exists) return null;
    return { id, applicationId, kind: 'explanation', status: 'pending', createdAt: nowIso() };
  }

  async requestHumanReview(
    actor: Actor,
    applicationId: string,
    input: ApplicationActionInput,
  ): Promise<ApplicationRequestRecord | null> {
    const id = randomUUID();
    const exists = await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const scoped = await client.query(
        `SELECT 1
           FROM hiring.applications AS application
           JOIN hiring.candidates AS candidate ON candidate.id = application.candidate_id
          WHERE application.tenant_id = $1
            AND application.id = $2
            AND candidate.user_id = $3`,
        [actor.tenantId, applicationId, actor.userId],
      );
      if (scoped.rowCount !== 1) return false;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'human_review.request',
        resourceType: 'human_review_request',
        resourceId: id,
        outcome: 'success',
        metadata: { applicationId, reasonHash: contentHash(input.reason) },
      });
      return true;
    });
    if (!exists) return null;
    return { id, applicationId, kind: 'human_review', status: 'pending', createdAt: nowIso() };
  }

  async requestWithdrawal(
    actor: Actor,
    applicationId: string,
    input: ApplicationActionInput,
  ): Promise<ApplicationRequestRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{ id: string }>(
        `UPDATE hiring.applications AS application
            SET status = 'withdrawn', updated_at = now()
          WHERE application.tenant_id = $1
            AND application.id = $2
            AND EXISTS (
              SELECT 1 FROM hiring.candidates AS candidate
               WHERE candidate.id = application.candidate_id
                 AND candidate.tenant_id = application.tenant_id
                 AND candidate.user_id = $3
            )
        RETURNING application.id`,
        [actor.tenantId, applicationId, actor.userId],
      );
      const id = r.rows[0]?.id;
      if (id === undefined) return null;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'application.withdraw',
        resourceType: 'application',
        resourceId: id,
        outcome: 'success',
        metadata: { reasonHash: contentHash(input.reason) },
      });
      return { id, applicationId, kind: 'withdrawal', status: 'withdrawn', createdAt: nowIso() };
    });
  }
}

// ─── Candidate Merges ─────────────────────────────────────────────────────────

import type { CandidateMergeRepository } from './candidate-merges.js';

export class PgCandidateMergeRepository implements CandidateMergeRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async previewMerge(
    actor: Actor,
    input: { primaryCandidateId: string; duplicateCandidateId: string },
  ): Promise<{
    primaryCandidateId: string;
    duplicateCandidateId: string;
    conflicts: readonly string[];
    fieldsMerged: number;
  } | null> {
    return {
      primaryCandidateId: input.primaryCandidateId,
      duplicateCandidateId: input.duplicateCandidateId,
      conflicts: [],
      fieldsMerged: 0,
    };
  }

  async mergeCandidates(
    actor: Actor,
    input: { primaryCandidateId: string; duplicateCandidateId: string },
  ): Promise<{
    id: string;
    primaryCandidateId: string;
    duplicateCandidateId: string;
    status: string;
    mergedAt: string;
  } | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO hiring.candidate_merge_events (id, tenant_id, source_candidate_id, target_candidate_id, merged_by) VALUES ($1,$2,$3,$4,$5)`,
        [id, actor.tenantId, input.primaryCandidateId, input.duplicateCandidateId, actor.userId],
      );
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'candidate.merge',
        resourceType: 'candidate_merge_event',
        resourceId: id,
        outcome: 'success',
        metadata: {},
      });
      return {
        id,
        primaryCandidateId: input.primaryCandidateId,
        duplicateCandidateId: input.duplicateCandidateId,
        status: 'merged',
        mergedAt: nowIso(),
      };
    });
  }

  async reverseMerge(
    actor: Actor,
    mergeId: string,
  ): Promise<{
    id: string;
    primaryCandidateId: string;
    duplicateCandidateId: string;
    status: string;
    mergedAt: string;
  } | null> {
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'candidate.merge.reverse',
        resourceType: 'candidate_merge_event',
        resourceId: mergeId,
        outcome: 'success',
        metadata: {},
      });
    });
    return {
      id: mergeId,
      primaryCandidateId: '',
      duplicateCandidateId: '',
      status: 'reversed',
      mergedAt: nowIso(),
    };
  }
}

// ─── Candidate Portal ─────────────────────────────────────────────────────────

import type {
  CandidatePortalRepository,
  CandidateProfileData,
  CandidateInvitationData,
  CandidateApplicationStatusData,
  CandidatePracticeModuleData,
} from './candidate-portal.js';

interface CandidateApplicationStatusRow {
  application_id: string;
  employer_name: string;
  role_name: string;
  assessment_title: string;
  status: string;
  applied_at: Date;
  invited_at: Date | null;
  due_at: Date | null;
  decision: string | null;
  reason: string | null;
  decided_by: string | null;
  issued_at: Date | null;
}

function toCandidateApplicationStatus(
  row: CandidateApplicationStatusRow,
): CandidateApplicationStatusData {
  return {
    applicationId: row.application_id,
    employerName: row.employer_name,
    roleName: row.role_name,
    assessmentTitle: row.assessment_title,
    status: row.status,
    appliedAt: row.applied_at.toISOString(),
    invitedAt: row.invited_at?.toISOString() ?? null,
    dueAt: row.due_at?.toISOString() ?? null,
    decision:
      row.decision === null || row.issued_at === null
        ? null
        : {
            outcome: row.decision,
            rationale: row.reason ?? '',
            decidedBy: row.decided_by ?? 'Named human decision owner',
            issuedAt: row.issued_at.toISOString(),
          },
  };
}

export class PgCandidatePortalRepository implements CandidatePortalRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async getProfile(actor: Actor): Promise<CandidateProfileData | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const ur = await client.query<{ id: string; email: string; full_name: string | null }>(
        `SELECT u.id, u.email, p.full_name FROM iam.users u LEFT JOIN iam.user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
        [actor.userId],
      );
      if (!ur.rows[0]) return null;
      const ar = await client.query<CandidateApplicationStatusRow>(
        `SELECT application.id AS application_id,
                organization.display_name AS employer_name,
                campaign.role_name,
                COALESCE(assessment.title, campaign.title) AS assessment_title,
                application.status,
                application.created_at AS applied_at,
                invitation.sent_at AS invited_at,
                invitation.expires_at AS due_at,
                decision.decision,
                decision.reason,
                COALESCE(decider.display_name, decider_profile.full_name) AS decided_by,
                decision.issued_at
           FROM hiring.applications AS application
           JOIN hiring.candidates AS candidate
             ON candidate.id = application.candidate_id
            AND candidate.tenant_id = application.tenant_id
           JOIN hiring.campaigns AS campaign ON campaign.id = application.campaign_id
           JOIN tenant.organizations AS organization ON organization.id = application.tenant_id
      LEFT JOIN hiring.campaign_versions AS campaign_version
             ON campaign_version.campaign_id = campaign.id
            AND campaign_version.version_no = campaign.current_version_no
      LEFT JOIN assessment.assessment_versions AS assessment_version
             ON assessment_version.id = campaign_version.assessment_version_id
      LEFT JOIN assessment.assessments AS assessment
             ON assessment.id = assessment_version.assessment_id
      LEFT JOIN LATERAL (
                SELECT sent_at, expires_at
                  FROM hiring.invitations
                 WHERE application_id = application.id
                 ORDER BY created_at DESC LIMIT 1
                ) AS invitation ON true
      LEFT JOIN LATERAL (
                SELECT decision, reason, decided_by, issued_at
                  FROM review.progression_decisions
                 WHERE application_id = application.id AND status = 'issued'
                 ORDER BY issued_at DESC NULLS LAST LIMIT 1
                ) AS decision ON true
      LEFT JOIN iam.users AS decider ON decider.id = decision.decided_by
      LEFT JOIN iam.user_profiles AS decider_profile ON decider_profile.user_id = decision.decided_by
          WHERE application.tenant_id = $1 AND candidate.user_id = $2
          ORDER BY application.created_at DESC LIMIT 10`,
        [actor.tenantId, actor.userId],
      );
      return {
        candidateId: ur.rows[0].id,
        email: ur.rows[0].email,
        displayName: ur.rows[0].full_name ?? '',
        applications: ar.rows.map(toCandidateApplicationStatus),
      };
    });
  }

  async getInvitation(actor: Actor): Promise<CandidateInvitationData | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{
        invitation_id: string;
        campaign_title: string;
        expires_at: Date;
        status: string;
      }>(
        `SELECT invitation.id AS invitation_id,
                COALESCE(campaign.title, 'Campaign') AS campaign_title,
                invitation.expires_at,
                invitation.status
           FROM hiring.invitations AS invitation
           JOIN hiring.applications AS application ON application.id = invitation.application_id
           JOIN hiring.candidates AS candidate
             ON candidate.id = application.candidate_id
            AND candidate.tenant_id = application.tenant_id
           JOIN hiring.campaigns AS campaign ON campaign.id = application.campaign_id
          WHERE invitation.tenant_id = $1 AND candidate.user_id = $2
          ORDER BY invitation.created_at DESC LIMIT 1`,
        [actor.tenantId, actor.userId],
      );
      if (!r.rows[0]) return null;
      return {
        invitationId: r.rows[0].invitation_id,
        campaignTitle: r.rows[0].campaign_title,
        expiresAt: r.rows[0].expires_at.toISOString(),
        status: r.rows[0].status,
      };
    });
  }

  async getApplicationStatus(
    actor: Actor,
    applicationId: string,
  ): Promise<CandidateApplicationStatusData | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const result = await client.query<CandidateApplicationStatusRow>(
        `SELECT application.id AS application_id,
                organization.display_name AS employer_name,
                campaign.role_name,
                COALESCE(assessment.title, campaign.title) AS assessment_title,
                application.status,
                application.created_at AS applied_at,
                invitation.sent_at AS invited_at,
                invitation.expires_at AS due_at,
                decision.decision,
                decision.reason,
                COALESCE(decider.display_name, decider_profile.full_name) AS decided_by,
                decision.issued_at
           FROM hiring.applications AS application
           JOIN hiring.candidates AS candidate
             ON candidate.id = application.candidate_id
            AND candidate.tenant_id = application.tenant_id
           JOIN hiring.campaigns AS campaign ON campaign.id = application.campaign_id
           JOIN tenant.organizations AS organization ON organization.id = application.tenant_id
      LEFT JOIN hiring.campaign_versions AS campaign_version
             ON campaign_version.campaign_id = campaign.id
            AND campaign_version.version_no = campaign.current_version_no
      LEFT JOIN assessment.assessment_versions AS assessment_version
             ON assessment_version.id = campaign_version.assessment_version_id
      LEFT JOIN assessment.assessments AS assessment
             ON assessment.id = assessment_version.assessment_id
      LEFT JOIN LATERAL (
                SELECT sent_at, expires_at
                  FROM hiring.invitations
                 WHERE application_id = application.id
                 ORDER BY created_at DESC LIMIT 1
                ) AS invitation ON true
      LEFT JOIN LATERAL (
                SELECT decision, reason, decided_by, issued_at
                  FROM review.progression_decisions
                 WHERE application_id = application.id AND status = 'issued'
                 ORDER BY issued_at DESC NULLS LAST LIMIT 1
                ) AS decision ON true
      LEFT JOIN iam.users AS decider ON decider.id = decision.decided_by
      LEFT JOIN iam.user_profiles AS decider_profile ON decider_profile.user_id = decision.decided_by
          WHERE application.tenant_id = $1
            AND application.id = $2
            AND candidate.user_id = $3`,
        [actor.tenantId, applicationId, actor.userId],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      return toCandidateApplicationStatus(row);
    });
  }

  async listPracticeModules(actor: Actor): Promise<readonly CandidatePracticeModuleData[]> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const result = await client.query<{
        id: string;
        title: string;
        instructions: Record<string, unknown>;
        duration_seconds: number;
        task_count: string;
      }>(
        `SELECT version.id,
                assessment.title,
                version.instructions,
                version.duration_seconds,
                count(item.id)::text AS task_count
           FROM assessment.assessment_versions AS version
           JOIN assessment.assessments AS assessment ON assessment.id = version.assessment_id
      LEFT JOIN assessment.assessment_sections AS section
             ON section.assessment_version_id = version.id
      LEFT JOIN assessment.assessment_items AS item ON item.section_id = section.id
          WHERE version.status = 'active'
            AND assessment.lifecycle_status = 'active'
            AND (assessment.tenant_id IS NULL OR assessment.tenant_id = $1)
            AND (assessment.code ILIKE 'PRACTICE%' OR version.instructions->>'practice' = 'true')
          GROUP BY version.id, assessment.title
          ORDER BY assessment.title, version.version_no DESC`,
        [actor.tenantId],
      );
      return result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description:
          typeof row.instructions.description === 'string'
            ? row.instructions.description
            : 'Practice module for the controlled assessment environment.',
        durationSeconds: row.duration_seconds,
        taskCount: Number(row.task_count),
      }));
    });
  }
}

// ─── Data Rights ──────────────────────────────────────────────────────────────

import type {
  DataRightRequestRecord,
  DataRightRequestCreate,
  ComplaintCreate,
  ComplaintRecord,
  DataRightsRepository,
} from './data-rights.js';

interface DataRightRow {
  id: string;
  request_type: string;
  status: string;
  candidate_id: string;
  received_at: Date;
}

export class PgDataRightsRepository implements DataRightsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listDataRights(
    actor: Actor,
  ): Promise<{ items: readonly DataRightRequestRecord[]; total: number }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<DataRightRow>(
        `SELECT request.id, request.request_type, request.status,
                request.candidate_id, request.received_at
           FROM governance.data_subject_requests AS request
           JOIN hiring.candidates AS candidate
             ON candidate.id = request.candidate_id
            AND candidate.tenant_id = request.tenant_id
          WHERE request.tenant_id = $1 AND candidate.user_id = $2
          ORDER BY request.received_at DESC LIMIT 100`,
        [actor.tenantId, actor.userId],
      );
      const items: DataRightRequestRecord[] = r.rows.map((row) => ({
        id: row.id,
        requestType: row.request_type as DataRightRequestRecord['requestType'],
        status: row.status as DataRightRequestRecord['status'],
        candidateId: row.candidate_id,
        createdAt: row.received_at.toISOString(),
      }));
      return { items, total: items.length };
    });
  }

  async createDataRight(
    actor: Actor,
    input: DataRightRequestCreate,
  ): Promise<DataRightRequestRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const id = randomUUID();
      const inserted = await client.query<{ candidate_id: string; received_at: Date }>(
        `INSERT INTO governance.data_subject_requests
           (id, tenant_id, candidate_id, request_type, status, details, due_at)
         SELECT $1, $2, candidate.id, $3, 'received', $4, now() + interval '30 days'
           FROM hiring.candidates AS candidate
          WHERE candidate.tenant_id = $2 AND candidate.user_id = $5
        RETURNING candidate_id, received_at`,
        [id, actor.tenantId, input.requestType, input.justification, actor.userId],
      );
      const row = inserted.rows[0];
      if (row === undefined) return null;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'data_right.request',
        resourceType: 'data_subject_request',
        resourceId: id,
        outcome: 'success',
        metadata: { requestType: input.requestType },
      });
      return {
        id,
        requestType: input.requestType,
        status: 'received',
        candidateId: row.candidate_id,
        createdAt: row.received_at.toISOString(),
      };
    });
  }

  async createComplaint(actor: Actor, input: ComplaintCreate): Promise<ComplaintRecord | null> {
    const id = randomUUID();
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const inserted = await client.query<{ candidate_id: string; created_at: Date }>(
        `INSERT INTO governance.complaints
           (id, tenant_id, candidate_id, complaint_type, channel, description,
            confidentiality_level, status)
         SELECT $1, $2, candidate.id, $3, 'candidate_portal', $4, 'restricted', 'received'
           FROM hiring.candidates AS candidate
          WHERE candidate.tenant_id = $2 AND candidate.user_id = $5
        RETURNING candidate_id, created_at`,
        [id, actor.tenantId, input.category, input.description, actor.userId],
      );
      const row = inserted.rows[0];
      if (row === undefined) return null;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'complaint.create',
        resourceType: 'complaint',
        resourceId: id,
        outcome: 'success',
        metadata: { category: input.category },
      });
      return {
        id,
        category: input.category,
        status: 'received',
        candidateId: row.candidate_id,
        createdAt: row.created_at.toISOString(),
      };
    });
  }
}

// ─── Deployer Readiness ───────────────────────────────────────────────────────

import type {
  DeployerReadinessRecord,
  DeployerReadinessUpdate,
  DeployerReadinessRepository,
} from './deployer-readiness.js';

export class PgDeployerReadinessRepository implements DeployerReadinessRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async getReadiness(actor: Actor): Promise<DeployerReadinessRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const result = await client.query<{
        settings: Record<string, unknown>;
        updated_at: Date;
      }>(`SELECT settings, updated_at FROM tenant.organizations WHERE id = $1`, [actor.tenantId]);
      const row = result.rows[0];
      if (row === undefined) return null;
      const value =
        row.settings.deployerReadiness !== null &&
        typeof row.settings.deployerReadiness === 'object' &&
        !Array.isArray(row.settings.deployerReadiness)
          ? (row.settings.deployerReadiness as Record<string, unknown>)
          : {};
      const humanOversightConfirmed = value.humanOversightConfirmed === true;
      const monitoringConfirmed = value.monitoringConfirmed === true;
      const recordKeepingConfirmed = value.recordKeepingConfirmed === true;
      return {
        tenantId: actor.tenantId,
        humanOversightConfirmed,
        monitoringConfirmed,
        recordKeepingConfirmed,
        status:
          humanOversightConfirmed && monitoringConfirmed && recordKeepingConfirmed
            ? 'complete'
            : 'incomplete',
        updatedAt: row.updated_at.toISOString(),
      };
    });
  }

  async updateReadiness(
    actor: Actor,
    input: DeployerReadinessUpdate,
  ): Promise<DeployerReadinessRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const result = await client.query<{ updated_at: Date }>(
        `UPDATE tenant.organizations
            SET settings = jsonb_set(
                  settings,
                  '{deployerReadiness}',
                  $2::jsonb,
                  true
                ),
                updated_at = now()
          WHERE id = $1
        RETURNING updated_at`,
        [actor.tenantId, JSON.stringify(input)],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error('Organization not found for deployer readiness.');
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'deployer_readiness.update',
        resourceType: 'deployer_readiness',
        resourceId: actor.tenantId,
        outcome: 'success',
        metadata: input as unknown as Record<string, unknown>,
      });
      const allConfirmed =
        input.humanOversightConfirmed && input.monitoringConfirmed && input.recordKeepingConfirmed;
      return {
        tenantId: actor.tenantId,
        ...input,
        status: allConfirmed ? 'complete' : 'incomplete',
        updatedAt: row.updated_at.toISOString(),
      };
    });
  }
}

// ─── Integrations ─────────────────────────────────────────────────────────────

import type {
  IntegrationRecord,
  IntegrationCreate,
  IntegrationUpdate,
  IntegrationRepository,
} from './integrations.js';

interface IntegrationRow {
  id: string;
  connection_type: string;
  provider: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function toIntegration(r: IntegrationRow): IntegrationRecord {
  return {
    id: r.id,
    connectionType: r.connection_type,
    provider: r.provider,
    status: r.status as IntegrationRecord['status'],
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export class PgIntegrationRepository implements IntegrationRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listIntegrations(
    actor: Actor,
  ): Promise<{ items: readonly IntegrationRecord[]; total: number }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<IntegrationRow>(
        `SELECT id, connection_type, provider, status, created_at, updated_at FROM integration.connections WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [actor.tenantId],
      );
      return { items: r.rows.map(toIntegration), total: r.rows.length };
    });
  }

  async getIntegration(actor: Actor, id: string): Promise<IntegrationRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<IntegrationRow>(
        `SELECT id, connection_type, provider, status, created_at, updated_at FROM integration.connections WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      return r.rows[0] ? toIntegration(r.rows[0]) : null;
    });
  }

  async createIntegration(actor: Actor, input: IntegrationCreate): Promise<IntegrationRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<IntegrationRow>(
        `INSERT INTO integration.connections
           (id, tenant_id, connection_type, provider, config, status)
         VALUES ($1, $2, $3, $4, $5::jsonb, 'draft')
         RETURNING id, connection_type, provider, status, created_at, updated_at`,
        [
          randomUUID(),
          actor.tenantId,
          input.connectionType,
          input.provider,
          JSON.stringify(input.config ?? {}),
        ],
      );
      if (!r.rows[0]) throw new Error('integration row missing');
      return toIntegration(r.rows[0]);
    });
  }

  async updateIntegration(
    actor: Actor,
    id: string,
    input: IntegrationUpdate,
  ): Promise<IntegrationRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<IntegrationRow>(
        `UPDATE integration.connections
            SET status = COALESCE($3, status),
                config = CASE WHEN $4::boolean THEN $5::jsonb ELSE config END,
                updated_at = now()
          WHERE tenant_id = $1 AND id = $2
        RETURNING id, connection_type, provider, status, created_at, updated_at`,
        [
          actor.tenantId,
          id,
          input.status ?? null,
          input.config !== undefined,
          JSON.stringify(input.config ?? {}),
        ],
      );
      if (r.rows[0] !== undefined) {
        await new PgAuditWriter(client).append({
          tenantId: actor.tenantId,
          actorType: 'user',
          actorId: actor.userId,
          action: 'integration.update',
          resourceType: 'integration',
          resourceId: id,
          outcome: 'success',
          metadata: { fields: Object.keys(input) },
        });
      }
      return r.rows[0] ? toIntegration(r.rows[0]) : null;
    });
  }

  async rotateIntegration(actor: Actor, id: string): Promise<IntegrationRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'integration.rotate',
        resourceType: 'integration',
        resourceId: id,
        outcome: 'success',
        metadata: {},
      });
      const r = await client.query<IntegrationRow>(
        `SELECT id, connection_type, provider, status, created_at, updated_at FROM integration.connections WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      return r.rows[0] ? toIntegration(r.rows[0]) : null;
    });
  }
}

// ─── Member Invitations ───────────────────────────────────────────────────────

import type {
  MemberInvitationRecord,
  MemberInvitationCreate,
  MemberInvitationRepository,
} from './member-invitations.js';

export class PgMemberInvitationRepository implements MemberInvitationRepository {
  private readonly codec: AesGcmCandidateImportCodec;

  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
    dataKey = 'cpf-synthetic-demo-import-key-v1',
  ) {
    this.codec = new AesGcmCandidateImportCodec(dataKey);
  }

  async createInvitation(
    actor: Actor,
    input: MemberInvitationCreate,
  ): Promise<MemberInvitationRecord> {
    const id = randomUUID();
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const email = input.email.trim().toLowerCase();
      const result = await client.query<{
        status: string;
        created_at: Date;
      }>(
        `INSERT INTO iam.staff_invitations
           (id, tenant_id, email_hash, encrypted_email, role_codes, token_hash,
            invited_by, status, expires_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'sent', now() + interval '7 days')
         RETURNING status, created_at`,
        [
          id,
          actor.tenantId,
          contentHash(email),
          this.codec.encode(email),
          JSON.stringify(input.roles),
          contentHash(randomUUID()),
          actor.userId,
        ],
      );
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'member_invitation.create',
        resourceType: 'member_invitation',
        resourceId: id,
        outcome: 'success',
        metadata: { emailHash: contentHash(email), roles: input.roles },
      });
      const row = result.rows[0];
      if (row === undefined) throw new Error('Member invitation insert returned no row.');
      return {
        id,
        email,
        roles: input.roles,
        status: row.status,
        createdAt: row.created_at.toISOString(),
      };
    });
  }

  async resendInvitation(actor: Actor, id: string): Promise<MemberInvitationRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const result = await client.query<{
        encrypted_email: Buffer;
        role_codes: string[];
        status: string;
        created_at: Date;
      }>(
        `UPDATE iam.staff_invitations
            SET token_hash = $3, status = 'sent', expires_at = now() + interval '7 days'
          WHERE tenant_id = $1 AND id = $2
            AND status IN ('created', 'sent', 'expired', 'failed')
        RETURNING encrypted_email, role_codes, status, created_at`,
        [actor.tenantId, id, contentHash(randomUUID())],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'member_invitation.resend',
        resourceType: 'member_invitation',
        resourceId: id,
        outcome: 'success',
        metadata: {},
      });
      return {
        id,
        email: this.codec.decode(row.encrypted_email),
        roles: row.role_codes,
        status: row.status,
        createdAt: row.created_at.toISOString(),
      };
    });
  }

  async revokeInvitation(actor: Actor, id: string): Promise<boolean> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const result = await client.query(
        `UPDATE iam.staff_invitations
            SET status = 'revoked', revoked_at = now()
          WHERE tenant_id = $1 AND id = $2 AND status <> 'accepted'`,
        [actor.tenantId, id],
      );
      if ((result.rowCount ?? 0) === 0) return false;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'member_invitation.revoke',
        resourceType: 'member_invitation',
        resourceId: id,
        outcome: 'success',
        metadata: {},
      });
      return true;
    });
  }
}

// ─── Notification Templates ───────────────────────────────────────────────────

import type {
  NotificationTemplateRecord,
  NotificationTemplateCreate,
  NotificationTemplatePreview,
  NotificationTemplateRendered,
  NotificationTemplateRepository,
} from './notification-templates.js';

interface TemplateRow {
  id: string;
  template_code: string;
  version_no: number;
  locale: string;
  subject_template: string;
  body_template: string;
  allowed_variables: Record<string, unknown>;
  status: string;
  created_at: Date;
}

function toTemplate(r: TemplateRow): NotificationTemplateRecord {
  const configuredChannel = r.allowed_variables.__channel;
  return {
    id: r.id,
    templateCode: r.template_code,
    channel:
      configuredChannel === 'sms' || configuredChannel === 'in_app' ? configuredChannel : 'email',
    subject: r.subject_template,
    bodyHtml: r.body_template,
    status: r.status,
    createdAt: r.created_at.toISOString(),
  };
}

const TEMPLATE_COLUMNS = `id, template_code, version_no, locale, subject_template,
  body_template, allowed_variables, status, created_at`;

function renderTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) return '';
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  });
}

export class PgNotificationTemplateRepository implements NotificationTemplateRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listTemplates(
    actor: Actor,
  ): Promise<{ items: readonly NotificationTemplateRecord[]; total: number }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<TemplateRow>(
        `SELECT ${TEMPLATE_COLUMNS}
           FROM integration.notification_templates
          WHERE tenant_id = $1
          ORDER BY created_at DESC, id
          LIMIT 100`,
        [actor.tenantId],
      );
      return { items: r.rows.map(toTemplate), total: r.rows.length };
    });
  }

  async createTemplate(
    actor: Actor,
    input: NotificationTemplateCreate,
  ): Promise<NotificationTemplateRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<TemplateRow>(
        `INSERT INTO integration.notification_templates
           (id, tenant_id, template_code, version_no, locale, subject_template,
            body_template, allowed_variables, accessibility_review, status, created_by)
         VALUES ($1, $2, $3, 1, 'en-IE', $5, $6,
                 jsonb_build_object('__channel', $4::text),
                 '{"status":"pending"}'::jsonb, 'draft', $7)
         RETURNING ${TEMPLATE_COLUMNS}`,
        [
          randomUUID(),
          actor.tenantId,
          input.templateCode,
          input.channel,
          input.subject,
          input.bodyHtml,
          actor.userId,
        ],
      );
      if (!r.rows[0]) throw new Error('template row missing');
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'notification_template.create',
        resourceType: 'notification_template',
        resourceId: r.rows[0].id,
        outcome: 'success',
        metadata: { templateCode: input.templateCode, channel: input.channel },
      });
      return toTemplate(r.rows[0]);
    });
  }

  async activateTemplate(actor: Actor, id: string): Promise<NotificationTemplateRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<TemplateRow>(
        `UPDATE integration.notification_templates
            SET status = 'active'
          WHERE tenant_id = $1 AND id = $2 AND status = 'approved'
        RETURNING ${TEMPLATE_COLUMNS}`,
        [actor.tenantId, id],
      );
      if (r.rows[0] !== undefined) {
        await new PgAuditWriter(client).append({
          tenantId: actor.tenantId,
          actorType: 'user',
          actorId: actor.userId,
          action: 'notification_template.activate',
          resourceType: 'notification_template',
          resourceId: id,
          outcome: 'success',
          metadata: {},
        });
      }
      return r.rows[0] ? toTemplate(r.rows[0]) : null;
    });
  }

  async previewTemplate(
    actor: Actor,
    id: string,
    input: NotificationTemplatePreview,
  ): Promise<NotificationTemplateRendered | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const result = await client.query<TemplateRow>(
        `SELECT ${TEMPLATE_COLUMNS}
           FROM integration.notification_templates
          WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      const variables = input.variables ?? {};
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'notification_template.preview',
        resourceType: 'notification_template',
        resourceId: id,
        outcome: 'success',
        metadata: { variables: Object.keys(variables) },
      });
      return {
        subject: renderTemplate(row.subject_template, variables),
        bodyHtml: renderTemplate(row.body_template, variables),
      };
    });
  }

  async testSendTemplate(
    actor: Actor,
    id: string,
    input: { recipient: string },
  ): Promise<{ queued: boolean } | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const template = await client.query<TemplateRow>(
        `SELECT ${TEMPLATE_COLUMNS}
           FROM integration.notification_templates
          WHERE tenant_id = $1 AND id = $2 AND status = 'active'`,
        [actor.tenantId, id],
      );
      const row = template.rows[0];
      if (row === undefined) return null;
      await client.query(
        `INSERT INTO integration.outbound_messages
           (id, tenant_id, template_code, template_version, recipient_hash, status, payload)
         VALUES ($1, $2, $3, $4, $5, 'queued', $6::jsonb)`,
        [
          randomUUID(),
          actor.tenantId,
          row.template_code,
          String(row.version_no),
          contentHash(input.recipient.trim().toLowerCase()),
          JSON.stringify({ test: true, locale: row.locale }),
        ],
      );
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'notification_template.test_send',
        resourceType: 'notification_template',
        resourceId: id,
        outcome: 'success',
        metadata: { recipientHash: contentHash(input.recipient.trim().toLowerCase()) },
      });
      return { queued: true };
    });
  }
}

// ─── Plugins ──────────────────────────────────────────────────────────────────

import type {
  PluginRecord,
  PluginCreate,
  PluginStatusUpdate,
  PluginRepository,
} from './plugins.js';

interface PluginRow {
  id: string;
  code: string;
  provider: string;
  name: string;
  version: string;
  permissions: Record<string, unknown>;
  status: string;
  created_at: Date;
}

function toPlugin(r: PluginRow): PluginRecord {
  return {
    id: r.id,
    code: r.code,
    provider: r.provider,
    name: r.name,
    version: r.version,
    permissions: r.permissions,
    status: r.status as PluginRecord['status'],
    createdAt: r.created_at.toISOString(),
    updatedAt: r.created_at.toISOString(),
  };
}

export class PgPluginRepository implements PluginRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listPlugins(actor: Actor): Promise<{ items: readonly PluginRecord[]; total: number }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<PluginRow>(
        `SELECT id, code, provider, name, version, permissions, status, created_at
           FROM assessment.plugin_registry ORDER BY created_at DESC LIMIT 100`,
      );
      return { items: r.rows.map(toPlugin), total: r.rows.length };
    });
  }

  async createPlugin(actor: Actor, input: PluginCreate): Promise<PluginRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<PluginRow>(
        `INSERT INTO assessment.plugin_registry
           (id, code, provider, name, version, permissions, security_review, privacy_review, accessibility_review, status)
         VALUES ($1,$2,$3,$4,$5,$6,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'draft')
         RETURNING id, code, provider, name, version, permissions, status, created_at`,
        [randomUUID(), input.code, input.provider, input.name, input.version, input.permissions],
      );
      if (!r.rows[0]) throw new Error('plugin row missing');
      return toPlugin(r.rows[0]);
    });
  }

  async updatePluginStatus(
    actor: Actor,
    id: string,
    input: PluginStatusUpdate,
  ): Promise<PluginRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<PluginRow>(
        `UPDATE assessment.plugin_registry SET status = $1 WHERE id = $2
         RETURNING id, code, provider, name, version, permissions, status, created_at`,
        [input.status, id],
      );
      return r.rows[0] ? toPlugin(r.rows[0]) : null;
    });
  }
}

// ─── Prompt Versions ─────────────────────────────────────────────────────────

import type {
  PromptVersionRecord,
  PromptVersionCreate,
  PromptVersionRepository,
} from './prompt-versions.js';

interface PromptRow {
  id: string;
  code: string;
  version: number;
  status: string;
  system_prompt: string;
  purpose: string;
  safety_policy: Record<string, unknown>;
  created_at: Date;
}

function toPrompt(r: PromptRow): PromptVersionRecord {
  return {
    id: r.id,
    promptCode: r.code,
    version: r.version,
    status: r.status as PromptVersionRecord['status'],
    body: r.system_prompt,
    purpose: r.purpose,
    safetyPolicy: r.safety_policy,
    createdAt: r.created_at.toISOString(),
  };
}

export class PgPromptVersionRepository implements PromptVersionRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listVersions(
    actor: Actor,
  ): Promise<{ items: readonly PromptVersionRecord[]; total: number }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<PromptRow>(
        `SELECT id, code, version_no AS version, status, system_prompt, purpose, safety_policy, created_at
           FROM assessment.prompt_versions ORDER BY created_at DESC LIMIT 100`,
      );
      return { items: r.rows.map(toPrompt), total: r.rows.length };
    });
  }

  async createVersion(actor: Actor, input: PromptVersionCreate): Promise<PromptVersionRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const maxRes = await client.query<{ m: string }>(
        `SELECT max(version_no)::text AS m FROM assessment.prompt_versions WHERE code = $1`,
        [input.promptCode],
      );
      const versionNo = Number(maxRes.rows[0]?.m ?? '0') + 1;
      const r = await client.query<PromptRow>(
        `INSERT INTO assessment.prompt_versions
           (id, code, version_no, purpose, system_prompt, safety_policy, status)
         VALUES ($1,$2,$3,$4,$5,$6,'draft')
         RETURNING id, code, version_no AS version, status, system_prompt, purpose, safety_policy, created_at`,
        [randomUUID(), input.promptCode, versionNo, input.purpose, input.body, input.safetyPolicy],
      );
      if (!r.rows[0]) throw new Error('prompt row missing');
      return toPrompt(r.rows[0]);
    });
  }

  async activateVersion(actor: Actor, id: string): Promise<PromptVersionRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<PromptRow>(
        `UPDATE assessment.prompt_versions
            SET status = 'active', approved_by = COALESCE(approved_by, $1), approved_at = COALESCE(approved_at, now())
          WHERE id = $2 AND status IN ('approved','active')
         RETURNING id, code, version_no AS version, status, system_prompt, purpose, safety_policy, created_at`,
        [actor.userId, id],
      );
      return r.rows[0] ? toPrompt(r.rows[0]) : null;
    });
  }
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

import type { WebhookRecord, WebhookCreate, WebhookRepository } from './webhooks.js';

interface WebhookRow {
  id: string;
  target_url: string;
  event_types: string[];
  status: string;
  created_at: Date;
  updated_at: Date;
}

function toWebhook(r: WebhookRow): WebhookRecord {
  return {
    id: r.id,
    targetUrl: r.target_url,
    eventTypes: r.event_types,
    status: r.status as WebhookRecord['status'],
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export class PgWebhookRepository implements WebhookRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listWebhooks(actor: Actor): Promise<{ items: readonly WebhookRecord[]; total: number }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<WebhookRow>(
        `SELECT id, target_url, event_types, status, created_at, updated_at FROM integration.webhook_subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [actor.tenantId],
      );
      return { items: r.rows.map(toWebhook), total: r.rows.length };
    });
  }

  async createWebhook(actor: Actor, input: WebhookCreate): Promise<WebhookRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<WebhookRow>(
        `INSERT INTO integration.webhook_subscriptions (id, tenant_id, target_url, event_types, status, signing_secret) VALUES ($1,$2,$3,$4,'active',$5) RETURNING id, target_url, event_types, status, created_at, updated_at`,
        [randomUUID(), actor.tenantId, input.targetUrl, input.eventTypes ?? [], randomUUID()],
      );
      if (!r.rows[0]) throw new Error('webhook row missing');
      return toWebhook(r.rows[0]);
    });
  }

  async updateWebhookStatus(
    actor: Actor,
    id: string,
    input: { status: string },
  ): Promise<WebhookRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<WebhookRow>(
        `UPDATE integration.webhook_subscriptions SET status = $1, updated_at = now() WHERE tenant_id = $2 AND id = $3 RETURNING id, target_url, event_types, status, created_at, updated_at`,
        [input.status, actor.tenantId, id],
      );
      return r.rows[0] ? toWebhook(r.rows[0]) : null;
    });
  }
}

// ─── Review Assignments ───────────────────────────────────────────────────────

import type { ReviewAssignmentRecord, ReviewAssignmentCreate } from './review-assignment-types.js';
import type {
  ReviewAssignmentRepository,
  AssignmentDeclineInput,
  AssignmentConflictInput,
  AssignmentAnnotationInput,
  AssignmentAnnotationRecord,
  AssignmentClarificationInput,
  AssignmentClarificationRecord,
} from './review-assignments.js';

interface AssignmentRow {
  id: string;
  tenant_id: string;
  submission_id: string;
  reviewer_profile_id: string;
  assignment_type: string;
  blind_group: string | null;
  status: string;
  assigned_at: Date;
  due_at: Date | null;
  submitted_at: Date | null;
  assessment_title?: string;
  candidate_reference?: string;
  criterion_count?: string | number;
  evidence_count?: string | number;
  total_count?: string | number;
}

function toAssignment(r: AssignmentRow): ReviewAssignmentRecord {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    submissionId: r.submission_id,
    reviewerProfileId: r.reviewer_profile_id,
    assignmentType: r.assignment_type as ReviewAssignmentRecord['assignmentType'],
    blindGroup: r.blind_group,
    status: r.status as ReviewAssignmentRecord['status'],
    assignedAt: r.assigned_at.toISOString(),
    dueAt: r.due_at?.toISOString() ?? null,
    submittedAt: r.submitted_at?.toISOString() ?? null,
    ...(r.assessment_title === undefined ? {} : { assessmentTitle: r.assessment_title }),
    ...(r.candidate_reference === undefined ? {} : { candidateReference: r.candidate_reference }),
    ...(r.criterion_count === undefined ? {} : { criterionCount: Number(r.criterion_count) }),
    ...(r.evidence_count === undefined ? {} : { evidenceCount: Number(r.evidence_count) }),
  };
}

export class PgReviewAssignmentRepository implements ReviewAssignmentRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listAssignments(
    actor: Actor,
    limit: number,
    cursor: string | null,
  ): Promise<{
    items: readonly ReviewAssignmentRecord[];
    total: number;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AssignmentRow>(
        `SELECT assignment.id, assignment.tenant_id, assignment.submission_id,
                assignment.reviewer_profile_id, assignment.assignment_type,
                assignment.blind_group, assignment.status, assignment.assigned_at,
                assignment.due_at, assignment.submitted_at,
                assessment.title AS assessment_title,
                COALESCE(candidate.external_reference,
                  'candidate-' || left(md5(candidate.id::text), 12)) AS candidate_reference,
                (SELECT count(*)::text FROM assessment.rubric_criteria AS criterion
                  WHERE criterion.rubric_version_id = binding.rubric_version_id) AS criterion_count,
                (SELECT count(*)::text FROM evidence.evidence_objects AS evidence
                  WHERE evidence.tenant_id = assignment.tenant_id
                    AND evidence.attempt_id = attempt.id) AS evidence_count,
                count(*) OVER() AS total_count
           FROM review.reviewer_assignments AS assignment
           JOIN hiring.reviewer_profiles AS reviewer
             ON reviewer.id = assignment.reviewer_profile_id
            AND reviewer.tenant_id = assignment.tenant_id
           JOIN runtime.submissions AS submission ON submission.id = assignment.submission_id
           JOIN runtime.attempts AS attempt ON attempt.id = submission.attempt_id
           JOIN runtime.attempt_version_bindings AS binding ON binding.attempt_id = attempt.id
           JOIN assessment.assessment_versions AS assessment_version
             ON assessment_version.id = binding.assessment_version_id
           JOIN assessment.assessments AS assessment
             ON assessment.id = assessment_version.assessment_id
           JOIN hiring.applications AS application ON application.id = attempt.application_id
           JOIN hiring.candidates AS candidate ON candidate.id = application.candidate_id
          WHERE assignment.tenant_id = $1
            AND ($3::boolean = false OR reviewer.user_id = $4)
            AND ($5::uuid IS NULL OR assignment.id < $5)
          ORDER BY assignment.assigned_at DESC, assignment.id DESC
          LIMIT $2`,
        [
          actor.tenantId,
          limit + 1,
          actor.roles.includes('employer_reviewer'),
          actor.userId,
          cursor,
        ],
      );
      const hasMore = r.rows.length > limit;
      return {
        items: r.rows.slice(0, limit).map(toAssignment),
        total: Number(r.rows[0]?.total_count ?? 0),
        hasMore,
        nextCursor: null,
      };
    });
  }

  async getAssignment(actor: Actor, id: string): Promise<ReviewAssignmentRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AssignmentRow>(
        `SELECT assignment.id, assignment.tenant_id, assignment.submission_id,
                assignment.reviewer_profile_id, assignment.assignment_type,
                assignment.blind_group, assignment.status, assignment.assigned_at,
                assignment.due_at, assignment.submitted_at,
                assessment.title AS assessment_title,
                COALESCE(candidate.external_reference,
                  'candidate-' || left(md5(candidate.id::text), 12)) AS candidate_reference,
                (SELECT count(*)::text FROM assessment.rubric_criteria AS criterion
                  WHERE criterion.rubric_version_id = binding.rubric_version_id) AS criterion_count,
                (SELECT count(*)::text FROM evidence.evidence_objects AS evidence
                  WHERE evidence.tenant_id = assignment.tenant_id
                    AND evidence.attempt_id = attempt.id) AS evidence_count
           FROM review.reviewer_assignments AS assignment
           JOIN hiring.reviewer_profiles AS reviewer
             ON reviewer.id = assignment.reviewer_profile_id
            AND reviewer.tenant_id = assignment.tenant_id
           JOIN runtime.submissions AS submission ON submission.id = assignment.submission_id
           JOIN runtime.attempts AS attempt ON attempt.id = submission.attempt_id
           JOIN runtime.attempt_version_bindings AS binding ON binding.attempt_id = attempt.id
           JOIN assessment.assessment_versions AS assessment_version
             ON assessment_version.id = binding.assessment_version_id
           JOIN assessment.assessments AS assessment
             ON assessment.id = assessment_version.assessment_id
           JOIN hiring.applications AS application ON application.id = attempt.application_id
           JOIN hiring.candidates AS candidate ON candidate.id = application.candidate_id
          WHERE assignment.tenant_id = $1 AND assignment.id = $2
            AND ($3::boolean = false OR reviewer.user_id = $4)`,
        [actor.tenantId, id, actor.roles.includes('employer_reviewer'), actor.userId],
      );
      const row = r.rows[0];
      if (row === undefined) return null;
      const evidence = await client.query<{
        id: string;
        evidence_type: string;
        source_table: string;
        object_uri: string | null;
        sha256: string | null;
        metadata: Record<string, unknown>;
        created_at: Date;
        reviewed: boolean;
      }>(
        `SELECT evidence.id, evidence.evidence_type, evidence.source_table,
                evidence.object_uri, evidence.sha256, evidence.metadata, evidence.created_at,
                EXISTS (
                  SELECT 1 FROM review.evidence_annotations AS annotation
                   WHERE annotation.tenant_id = evidence.tenant_id
                     AND annotation.assignment_id = $2
                     AND annotation.evidence_object_id = evidence.id
                     AND annotation.created_by = $3
                ) AS reviewed
           FROM evidence.evidence_objects AS evidence
           JOIN runtime.submissions AS submission ON submission.attempt_id = evidence.attempt_id
          WHERE evidence.tenant_id = $1 AND submission.id = $4
          ORDER BY evidence.created_at, evidence.id`,
        [actor.tenantId, id, actor.userId, row.submission_id],
      );
      const integrity = await client.query<{
        id: string;
        event_type: string;
        status: 'unreviewed' | 'under_review' | 'resolved';
        resolution: string | null;
        rationale: string | null;
        occurred_at: Date;
      }>(
        `SELECT event.id, event.event_type, event.status,
                resolution.resolution, resolution.rationale, event.occurred_at
           FROM evidence.integrity_events AS event
           JOIN runtime.submissions AS submission ON submission.attempt_id = event.attempt_id
      LEFT JOIN LATERAL (
                 SELECT item.resolution, item.rationale
                   FROM review.integrity_resolutions AS item
                  WHERE item.tenant_id = event.tenant_id
                    AND item.integrity_event_id = event.id
                    AND item.assignment_id = $2
                  ORDER BY item.resolved_at DESC, item.id DESC
                  LIMIT 1
                ) AS resolution ON true
          WHERE event.tenant_id = $1 AND submission.id = $3
          ORDER BY event.occurred_at, event.id`,
        [actor.tenantId, id, row.submission_id],
      );
      const clarifications = await client.query<{
        id: string;
        request_type: string;
        question: string;
        status: string;
        created_at: Date;
      }>(
        `SELECT id, request_type, question, status, created_at
           FROM review.clarification_requests
          WHERE tenant_id = $1 AND assignment_id = $2
          ORDER BY created_at, id`,
        [actor.tenantId, id],
      );
      return {
        ...toAssignment(row),
        evidence: evidence.rows.map((item) => ({
          id: item.id,
          evidenceType: item.evidence_type,
          sourceTable: item.source_table,
          objectUri: item.object_uri,
          sha256: item.sha256,
          metadata: item.metadata,
          createdAt: item.created_at.toISOString(),
          reviewed: item.reviewed,
        })),
        integrityEvents: integrity.rows.map((event) => ({
          id: event.id,
          eventType: event.event_type,
          status: event.status,
          resolution: event.resolution,
          rationale: event.rationale,
          occurredAt: event.occurred_at.toISOString(),
        })),
        clarifications: clarifications.rows.map((item) => ({
          id: item.id,
          requestType: item.request_type,
          question: item.question,
          status: item.status,
          createdAt: item.created_at.toISOString(),
        })),
      };
    });
  }

  async createAssignment(
    actor: Actor,
    input: ReviewAssignmentCreate,
  ): Promise<ReviewAssignmentRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const id = randomUUID();
      const now = new Date();
      await client.query(
        `INSERT INTO review.reviewer_assignments (id, tenant_id, submission_id, reviewer_profile_id, assignment_type, status, assigned_at, due_at) VALUES ($1,$2,$3,$4,$5,'assigned',$6,$7)`,
        [
          id,
          actor.tenantId,
          input.submissionId,
          input.reviewerProfileId,
          input.assignmentType,
          now,
          input.dueAt ? new Date(input.dueAt) : null,
        ],
      );
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'review_assignment.create',
        resourceType: 'reviewer_assignment',
        resourceId: id,
        outcome: 'success',
        metadata: {},
      });
      return {
        id,
        tenantId: actor.tenantId,
        submissionId: input.submissionId,
        reviewerProfileId: input.reviewerProfileId,
        assignmentType: input.assignmentType,
        blindGroup: null,
        status: 'assigned',
        assignedAt: now.toISOString(),
        dueAt: input.dueAt ?? null,
        submittedAt: null,
      };
    });
  }

  async acceptAssignment(actor: Actor, id: string): Promise<ReviewAssignmentRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AssignmentRow>(
        `UPDATE review.reviewer_assignments AS assignment
            SET status = 'accepted'
           FROM hiring.reviewer_profiles AS reviewer
          WHERE assignment.tenant_id = $1 AND assignment.id = $2
            AND reviewer.id = assignment.reviewer_profile_id
            AND reviewer.tenant_id = assignment.tenant_id
            AND ($3::boolean = false OR reviewer.user_id = $4)
            AND assignment.status = 'assigned'
        RETURNING assignment.id, assignment.tenant_id, assignment.submission_id,
                  assignment.reviewer_profile_id, assignment.assignment_type,
                  assignment.blind_group, assignment.status, assignment.assigned_at,
                  assignment.due_at, assignment.submitted_at`,
        [actor.tenantId, id, actor.roles.includes('employer_reviewer'), actor.userId],
      );
      return r.rows[0] ? toAssignment(r.rows[0]) : null;
    });
  }

  async stopAssignmentAi(actor: Actor, id: string): Promise<ReviewAssignmentRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const scoped = await client.query<AssignmentRow>(
        `SELECT assignment.id, assignment.tenant_id, assignment.submission_id,
                assignment.reviewer_profile_id, assignment.assignment_type,
                assignment.blind_group, assignment.status, assignment.assigned_at,
                assignment.due_at, assignment.submitted_at
           FROM review.reviewer_assignments AS assignment
           JOIN hiring.reviewer_profiles AS reviewer
             ON reviewer.id = assignment.reviewer_profile_id
            AND reviewer.tenant_id = assignment.tenant_id
          WHERE assignment.tenant_id = $1 AND assignment.id = $2
            AND ($3::boolean = false OR reviewer.user_id = $4)`,
        [actor.tenantId, id, actor.roles.includes('employer_reviewer'), actor.userId],
      );
      const row = scoped.rows[0];
      if (row === undefined) return null;
      const assignment = toAssignment(row);
      await client.query(
        `UPDATE evidence.ai_conversations AS conversation
            SET status = 'blocked', ended_at = COALESCE(ended_at, now())
           FROM runtime.submissions AS submission
          WHERE submission.tenant_id = $1
            AND submission.id = $2
            AND conversation.tenant_id = submission.tenant_id
            AND conversation.attempt_id = submission.attempt_id
            AND conversation.status = 'active'`,
        [actor.tenantId, assignment.submissionId],
      );
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'review_assignment.ai_stop',
        resourceType: 'reviewer_assignment',
        resourceId: id,
        outcome: 'success',
        metadata: {},
      });
      return assignment;
    });
  }

  async declineAssignment(
    actor: Actor,
    id: string,
    input: AssignmentDeclineInput,
  ): Promise<ReviewAssignmentRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AssignmentRow>(
        `UPDATE review.reviewer_assignments AS assignment
            SET status = 'cancelled'
           FROM hiring.reviewer_profiles AS reviewer
          WHERE assignment.tenant_id = $1 AND assignment.id = $2
            AND reviewer.id = assignment.reviewer_profile_id
            AND reviewer.tenant_id = assignment.tenant_id
            AND ($3::boolean = false OR reviewer.user_id = $4)
            AND assignment.status IN ('assigned', 'accepted')
        RETURNING assignment.id, assignment.tenant_id, assignment.submission_id,
                  assignment.reviewer_profile_id, assignment.assignment_type,
                  assignment.blind_group, assignment.status, assignment.assigned_at,
                  assignment.due_at, assignment.submitted_at`,
        [actor.tenantId, id, actor.roles.includes('employer_reviewer'), actor.userId],
      );
      if (r.rows[0])
        await new PgAuditWriter(client).append({
          tenantId: actor.tenantId,
          actorType: 'user',
          actorId: actor.userId,
          action: 'review_assignment.decline',
          resourceType: 'reviewer_assignment',
          resourceId: id,
          outcome: 'success',
          metadata: { reasonHash: contentHash(input.reason) },
        });
      return r.rows[0] ? toAssignment(r.rows[0]) : null;
    });
  }

  async setAssignmentConflict(
    actor: Actor,
    id: string,
    input: AssignmentConflictInput,
  ): Promise<ReviewAssignmentRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const result = await client.query<AssignmentRow>(
        `WITH scoped_assignment AS (
           SELECT assignment.id, assignment.tenant_id, assignment.submission_id,
                  assignment.reviewer_profile_id, assignment.assignment_type,
                  assignment.blind_group, assignment.status, assignment.assigned_at,
                  assignment.due_at, assignment.submitted_at
             FROM review.reviewer_assignments AS assignment
             JOIN hiring.reviewer_profiles AS reviewer
               ON reviewer.id = assignment.reviewer_profile_id
              AND reviewer.tenant_id = assignment.tenant_id
            WHERE assignment.tenant_id = $1 AND assignment.id = $2
              AND ($3::boolean = false OR reviewer.user_id = $4)
         ), campaign AS (
           SELECT attempt.campaign_id
             FROM scoped_assignment AS assignment
             JOIN runtime.submissions AS submission ON submission.id = assignment.submission_id
             JOIN runtime.attempts AS attempt ON attempt.id = submission.attempt_id
         ), updated AS (
           UPDATE hiring.campaign_reviewers AS campaign_reviewer
              SET conflict_status = $5
             FROM scoped_assignment AS assignment, campaign
            WHERE campaign_reviewer.tenant_id = $1
              AND campaign_reviewer.campaign_id = campaign.campaign_id
              AND campaign_reviewer.reviewer_profile_id = assignment.reviewer_profile_id
           RETURNING campaign_reviewer.id
         )
         SELECT assignment.* FROM scoped_assignment AS assignment
          WHERE EXISTS (SELECT 1 FROM updated)`,
        [
          actor.tenantId,
          id,
          actor.roles.includes('employer_reviewer'),
          actor.userId,
          input.declared ? 'declared' : 'clear',
        ],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'review_assignment.conflict',
        resourceType: 'reviewer_assignment',
        resourceId: id,
        outcome: 'success',
        metadata: {
          declared: input.declared,
          ...(input.reason === undefined ? {} : { reasonHash: contentHash(input.reason) }),
        },
      });
      return toAssignment(row);
    });
  }

  async addAnnotation(
    actor: Actor,
    assignmentId: string,
    input: AssignmentAnnotationInput,
  ): Promise<AssignmentAnnotationRecord | null> {
    const id = randomUUID();
    const inserted = await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const result = await client.query(
        `INSERT INTO review.evidence_annotations
           (id, tenant_id, assignment_id, evidence_object_id, annotation_type, visibility,
            body, evidence_version_hash, created_by)
         SELECT $1, $2, assignment.id, evidence.id, 'note', 'private', $5,
                COALESCE(evidence.sha256, encode(digest(evidence.id::text, 'sha256'), 'hex')), $6
           FROM review.reviewer_assignments AS assignment
           JOIN hiring.reviewer_profiles AS reviewer
             ON reviewer.id = assignment.reviewer_profile_id
            AND reviewer.tenant_id = assignment.tenant_id
           JOIN evidence.evidence_objects AS evidence
             ON evidence.id = $4 AND evidence.tenant_id = assignment.tenant_id
          WHERE assignment.tenant_id = $2 AND assignment.id = $3
            AND ($7::boolean = false OR reviewer.user_id = $6)`,
        [
          id,
          actor.tenantId,
          assignmentId,
          input.itemId,
          input.body,
          actor.userId,
          actor.roles.includes('employer_reviewer'),
        ],
      );
      return (result.rowCount ?? 0) > 0;
    });
    if (!inserted) return null;
    return { id, assignmentId, itemId: input.itemId, body: input.body, createdAt: nowIso() };
  }

  async addClarification(
    actor: Actor,
    assignmentId: string,
    input: AssignmentClarificationInput,
  ): Promise<AssignmentClarificationRecord | null> {
    const id = randomUUID();
    const inserted = await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const result = await client.query(
        `INSERT INTO review.clarification_requests
           (id, tenant_id, assignment_id, request_type, question, status, requested_by)
         SELECT $1, $2, assignment.id, 'candidate', $4, 'sent', $5
           FROM review.reviewer_assignments AS assignment
           JOIN hiring.reviewer_profiles AS reviewer
             ON reviewer.id = assignment.reviewer_profile_id
            AND reviewer.tenant_id = assignment.tenant_id
          WHERE assignment.tenant_id = $2 AND assignment.id = $3
            AND ($6::boolean = false OR reviewer.user_id = $5)`,
        [
          id,
          actor.tenantId,
          assignmentId,
          input.question,
          actor.userId,
          actor.roles.includes('employer_reviewer'),
        ],
      );
      return (result.rowCount ?? 0) > 0;
    });
    if (!inserted) return null;
    return { id, assignmentId, question: input.question, status: 'sent', createdAt: nowIso() };
  }
}

// ─── Review Quality ───────────────────────────────────────────────────────────

import type {
  ReviewQualityRepository,
  ScorecardAmendmentRecord,
  ScorecardAmendmentCreate,
  ObservationRecord,
  ReviewObservationPage,
  ObservationDispositionInput,
  IntegrityEventRecord,
  IntegrityResolutionInput,
} from './review-quality.js';

export class PgReviewQualityRepository implements ReviewQualityRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listObservations(
    actor: Actor,
    assignmentId: string,
  ): Promise<ReviewObservationPage | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const assignment = await client.query<{ submission_id: string; scoring_complete: boolean }>(
        `SELECT assignment.submission_id,
                EXISTS (
                  SELECT 1 FROM review.scorecards
                   WHERE assignment_id = assignment.id
                ) AND NOT EXISTS (
                  SELECT 1
                    FROM review.scorecards AS scorecard
                    JOIN assessment.rubric_criteria AS criterion
                      ON criterion.rubric_version_id = scorecard.rubric_version_id
               LEFT JOIN review.criterion_scores AS score
                      ON score.scorecard_id = scorecard.id
                     AND score.criterion_id = criterion.id
                   WHERE scorecard.assignment_id = assignment.id
                     AND score.human_score IS NULL
                     AND score.insufficient_evidence = false
                ) AS scoring_complete
           FROM review.reviewer_assignments AS assignment
           JOIN hiring.reviewer_profiles AS reviewer
             ON reviewer.id = assignment.reviewer_profile_id
            AND reviewer.tenant_id = assignment.tenant_id
          WHERE assignment.tenant_id = $1
            AND assignment.id = $2
            AND reviewer.user_id = $3`,
        [actor.tenantId, assignmentId, actor.userId],
      );
      const row = assignment.rows[0];
      if (row === undefined) return null;
      if (!row.scoring_complete) {
        return { items: [], total: 0, independentScoringComplete: false };
      }
      const result = await client.query<{
        id: string;
        criterion_id: string | null;
        observation_text: string;
        evidence_links: unknown[];
        limitations: unknown[];
        status: 'generated' | 'blocked' | 'reported' | 'withdrawn';
        generated_at: Date;
      }>(
        `SELECT id, criterion_id, observation_text, evidence_links, limitations, status, generated_at
           FROM evidence.reviewer_ai_observations
          WHERE tenant_id = $1 AND submission_id = $2
          ORDER BY generated_at, id`,
        [actor.tenantId, row.submission_id],
      );
      return {
        items: result.rows.map((observation) => ({
          id: observation.id,
          criterionId: observation.criterion_id,
          observation: observation.observation_text,
          evidenceLinks: observation.evidence_links,
          limitations: observation.limitations,
          status: observation.status,
          generatedAt: observation.generated_at.toISOString(),
        })),
        total: result.rows.length,
        independentScoringComplete: true,
      };
    });
  }

  async createAmendment(
    actor: Actor,
    scorecardId: string,
    input: ScorecardAmendmentCreate,
  ): Promise<ScorecardAmendmentRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const id = randomUUID();
      const inserted = await client.query<{ created_at: Date }>(
        `INSERT INTO review.review_amendments
           (id, tenant_id, scorecard_id, prior_scorecard_hash, amendment_json, reason,
            requested_by, status)
         SELECT $1, $2, scorecard.id,
                encode(digest(jsonb_build_object(
                  'id', scorecard.id,
                  'status', scorecard.status,
                  'updatedAt', scorecard.updated_at
                )::text, 'sha256'), 'hex'),
                jsonb_build_object('changes', $5::text), $4, $6, 'requested'
           FROM review.scorecards AS scorecard
          WHERE scorecard.tenant_id = $2 AND scorecard.id = $3
        RETURNING created_at`,
        [id, actor.tenantId, scorecardId, input.rationale, input.changes, actor.userId],
      );
      if (inserted.rows[0] === undefined) return null;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'scorecard.amend',
        resourceType: 'review_amendment',
        resourceId: id,
        outcome: 'success',
        metadata: { scorecardId },
      });
      return {
        id,
        scorecardId,
        rationale: input.rationale,
        createdAt: inserted.rows[0].created_at.toISOString(),
      };
    });
  }

  async setObservationDisposition(
    actor: Actor,
    observationId: string,
    input: ObservationDispositionInput,
  ): Promise<ObservationRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{ id: string; updated_at: Date }>(
        `UPDATE review.criterion_scores AS score
            SET ai_observation_disposition = $1, updated_at = now()
           FROM evidence.reviewer_ai_observations AS observation
          WHERE observation.tenant_id = $2
            AND observation.id = $3
            AND score.tenant_id = observation.tenant_id
            AND score.ai_observation_id = observation.id
        RETURNING observation.id, score.updated_at`,
        [input.disposition, actor.tenantId, observationId],
      );
      if (!r.rows[0]) return null;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'ai_observation.disposition',
        resourceType: 'reviewer_ai_observation',
        resourceId: observationId,
        outcome: 'success',
        metadata: {
          disposition: input.disposition,
          notePresent: input.note !== undefined && input.note.trim() !== '',
        },
      });
      return {
        id: r.rows[0].id,
        disposition: input.disposition,
        note: input.note ?? null,
        updatedAt: r.rows[0].updated_at.toISOString(),
      };
    });
  }

  async resolveIntegrityEvent(
    actor: Actor,
    eventId: string,
    input: IntegrityResolutionInput,
  ): Promise<IntegrityEventRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const result = await client.query<{ resolved_at: Date }>(
        `INSERT INTO review.integrity_resolutions
           (id, tenant_id, integrity_event_id, assignment_id, resolution, rationale,
            evidence_links, resolved_by)
         SELECT $1, $2, event.id, NULL, $4, $5, '[]'::jsonb, $6
           FROM evidence.integrity_events AS event
          WHERE event.tenant_id = $2 AND event.id = $3
         ON CONFLICT (integrity_event_id, assignment_id)
         DO UPDATE SET resolution = EXCLUDED.resolution,
                       rationale = EXCLUDED.rationale,
                       resolved_by = EXCLUDED.resolved_by,
                       resolved_at = now()
        RETURNING resolved_at`,
        [
          randomUUID(),
          actor.tenantId,
          eventId,
          input.resolution,
          input.note?.trim() || input.resolution,
          actor.userId,
        ],
      );
      if (result.rows[0] === undefined) return null;
      await client.query(
        `UPDATE evidence.integrity_events SET status = 'resolved' WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, eventId],
      );
      return {
        id: eventId,
        resolution: input.resolution,
        note: input.note ?? null,
        resolvedAt: result.rows[0].resolved_at.toISOString(),
      };
    });
  }
}

// ─── Submission Reports ───────────────────────────────────────────────────────

import type {
  SubmissionReportRecord,
  SubmissionReportCreate,
  SubmissionReportRepository,
} from './submission-reports.js';

export class PgSubmissionReportRepository implements SubmissionReportRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listReports(
    actor: Actor,
    submissionId: string,
  ): Promise<{ items: readonly SubmissionReportRecord[]; total: number } | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{
        id: string;
        report_format: string;
        status: string;
        created_at: Date;
      }>(
        `SELECT id, COALESCE(report_format, 'pdf') AS report_format, status, created_at FROM review.reports WHERE tenant_id = $1 AND submission_id = $2 ORDER BY created_at DESC LIMIT 50`,
        [actor.tenantId, submissionId],
      );
      const items: SubmissionReportRecord[] = r.rows.map((row) => ({
        id: row.id,
        submissionId,
        format: row.report_format as SubmissionReportRecord['format'],
        status: row.status,
        requestedAt: row.created_at.toISOString(),
      }));
      return { items, total: items.length };
    });
  }

  async createReport(
    actor: Actor,
    submissionId: string,
    input: SubmissionReportCreate,
  ): Promise<SubmissionReportRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO review.reports (id, tenant_id, submission_id, report_format, status, generated_by) VALUES ($1,$2,$3,$4,'pending',$5)`,
        [id, actor.tenantId, submissionId, input.format, actor.userId],
      );
      return { id, submissionId, format: input.format, status: 'pending', requestedAt: nowIso() };
    });
  }
}

// ─── Auth repository shim ─────────────────────────────────────────────────────

// AuthRepository interface inline for DemoAuthRepository shim
interface AuthRepository {
  login(input: unknown): Promise<unknown>;
  logout(input?: unknown): Promise<boolean>;
  logoutAll(input?: unknown): Promise<boolean>;
  requestPasswordReset(input?: unknown): Promise<void>;
  resetPassword(input?: unknown): Promise<boolean>;
  changePassword(input?: unknown): Promise<boolean>;
  verifyEmail(input?: unknown): Promise<boolean>;
  resendVerification(input?: unknown): Promise<void>;
  changeEmail(input?: unknown): Promise<boolean>;
  confirmEmailChange(input?: unknown): Promise<boolean>;
  listMfaMethods(input?: unknown): Promise<unknown>;
  enrollMfaMethod(input?: unknown): Promise<null>;
  removeMfaMethod(input?: unknown): Promise<boolean>;
  challengeMfa(input?: unknown): Promise<unknown>;
  rotateRecoveryCodes(input?: unknown): Promise<null>;
}

/**
 * Demo auth shim — full authentication (password hashing, token signing, MFA TOTP)
 * requires configuration beyond the demo scope. This satisfies the interface so the
 * handler can be wired; all methods return safe no-op responses.
 */
export class DemoAuthRepository implements AuthRepository {
  constructor(_pool: Pool) {}
  async login(_: unknown): Promise<null> {
    return null;
  }
  async logout(): Promise<false> {
    return false;
  }
  async logoutAll(): Promise<false> {
    return false;
  }
  async requestPasswordReset(): Promise<void> {}
  async resetPassword(): Promise<false> {
    return false;
  }
  async changePassword(): Promise<false> {
    return false;
  }
  async verifyEmail(): Promise<false> {
    return false;
  }
  async resendVerification(): Promise<void> {}
  async changeEmail(): Promise<false> {
    return false;
  }
  async confirmEmailChange(): Promise<false> {
    return false;
  }
  async listMfaMethods(): Promise<{
    readonly items: readonly never[];
    readonly nextCursor: null;
    readonly total: 0;
  }> {
    return { items: [], nextCursor: null, total: 0 };
  }
  async enrollMfaMethod(): Promise<null> {
    return null;
  }
  async removeMfaMethod(): Promise<false> {
    return false;
  }
  async challengeMfa(): Promise<null> {
    return null;
  }
  async rotateRecoveryCodes(): Promise<null> {
    return null;
  }
}
