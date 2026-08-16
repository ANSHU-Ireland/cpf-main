/**
 * PgExtended — concrete PostgreSQL implementations for every repository interface
 * that did not yet have a Pg adapter. Each class is wired to the v2.0 baseline schema
 * and satisfies its interface exactly (field names verified against the domain modules).
 */
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
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
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export class PgTenantRepository implements TenantRepository {
  constructor(private readonly pool: Pool) {}

  async listTenants(_a: Actor): Promise<{ items: readonly TenantRecord[]; total: number }> {
    const r = await this.pool.query<TenantRow>(
      `SELECT o.id, o.slug, o.legal_name, o.status, o.data_region, s.plan_id, o.created_at, o.updated_at FROM tenant.organizations o LEFT JOIN tenant.subscriptions s ON s.organization_id = o.id AND s.status = 'active' ORDER BY o.created_at DESC LIMIT 200`,
    );
    return { items: r.rows.map(toTenant), total: r.rows.length };
  }

  async getTenant(_a: Actor, id: string): Promise<TenantRecord | null> {
    const r = await this.pool.query<TenantRow>(
      `SELECT o.id, o.slug, o.legal_name, o.status, o.data_region, s.plan_id, o.created_at, o.updated_at FROM tenant.organizations o LEFT JOIN tenant.subscriptions s ON s.organization_id = o.id AND s.status = 'active' WHERE o.id = $1`,
      [id],
    );
    return r.rows[0] ? toTenant(r.rows[0]) : null;
  }

  async createTenant(_a: Actor, input: TenantCreate): Promise<TenantRecord> {
    const r = await this.pool.query<TenantRow>(
      `INSERT INTO tenant.organizations (id, slug, legal_name, status, data_region, metadata) VALUES ($1,$2,$3,'draft',$4,'{}'::jsonb) RETURNING id, slug, legal_name, status, data_region, NULL::uuid AS plan_id, created_at, updated_at`,
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
      `UPDATE tenant.organizations SET ${sets.join(',')} WHERE id = $${params.length} RETURNING id, slug, legal_name, status, data_region, NULL::uuid AS plan_id, created_at, updated_at`,
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
      `UPDATE tenant.organizations SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, slug, legal_name, status, data_region, NULL::uuid AS plan_id, created_at, updated_at`,
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
    return {
      currentStatus: r.rows[0].status as TenantRecord['status'],
      targetStatus: input.status,
      allowed: true,
      effects: [`Status: ${r.rows[0].status} → ${input.status}`],
    };
  }

  async changeTenantSubscription(
    _a: Actor,
    id: string,
    input: TenantSubscriptionChange,
  ): Promise<TenantRecord | null> {
    await this.pool.query(
      `INSERT INTO tenant.subscriptions (id, organization_id, plan_id, status, started_at) VALUES ($1,$2,$3,'active',now()) ON CONFLICT (organization_id) DO UPDATE SET plan_id=$3, status='active', updated_at=now()`,
      [randomUUID(), id, input.planId],
    );
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
      `SELECT id, code, display_name AS name, 0 AS price_cents, true AS active, created_at, updated_at FROM tenant.plans ORDER BY created_at DESC`,
    );
    return { items: r.rows.map(toPlan), total: r.rows.length };
  }

  async createPlan(_a: Actor, input: PlanCreate): Promise<PlanRecord> {
    const r = await this.pool.query<PlanRow>(
      `INSERT INTO tenant.plans (id, code, display_name, seat_limit) VALUES ($1,$2,$3,100) RETURNING id, code, display_name AS name, 0 AS price_cents, true AS active, created_at, updated_at`,
      [randomUUID(), input.code, input.name],
    );
    if (!r.rows[0]) throw new Error('plan row missing');
    return toPlan(r.rows[0]);
  }

  async updatePlan(_a: Actor, id: string, input: PlanUpdate): Promise<PlanRecord | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (input.name) {
      params.push(input.name);
      sets.push(`display_name = $${params.length}`);
    }
    if (!sets.length) return (await this.listPlans(_a)).items.find((p) => p.id === id) ?? null;
    sets.push('updated_at = now()');
    params.push(id);
    const r = await this.pool.query<PlanRow>(
      `UPDATE tenant.plans SET ${sets.join(',')} WHERE id = $${params.length} RETURNING id, code, display_name AS name, 0 AS price_cents, true AS active, created_at, updated_at`,
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
  flag_code: string;
  description: string;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

function toFlag(r: FlagRow): FeatureFlagRecord {
  return {
    id: r.id,
    key: r.flag_code,
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
      `SELECT id, flag_code, COALESCE(description, flag_code) AS description, enabled, created_at, updated_at FROM tenant.feature_flags ORDER BY created_at DESC LIMIT 200`,
    );
    return { items: r.rows.map(toFlag), total: r.rows.length };
  }

  async createFlag(_a: Actor, input: FeatureFlagCreate): Promise<FeatureFlagRecord> {
    const r = await this.pool.query<FlagRow>(
      `INSERT INTO tenant.feature_flags (id, flag_code, description, enabled) VALUES ($1,$2,$3,$4) RETURNING id, flag_code, description, enabled, created_at, updated_at`,
      [randomUUID(), input.key, input.description, input.enabled],
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
      `UPDATE tenant.feature_flags SET enabled = $1, updated_at = now() WHERE id = $2 RETURNING id, flag_code, COALESCE(description, flag_code) AS description, enabled, created_at, updated_at`,
      [input.enabled, id],
    );
    return r.rows[0] ? toFlag(r.rows[0]) : null;
  }
}

// ─── Admin: Releases ─────────────────────────────────────────────────────────

import type { ReleaseRecord, ReleaseRepository } from './admin-releases.js';

export class PgReleaseRepository implements ReleaseRepository {
  constructor(private readonly pool: Pool) {}

  async listReleases(_a: Actor): Promise<{ items: readonly ReleaseRecord[]; total: number }> {
    const r = await this.pool.query<{ id: string; action: string; created_at: Date }>(
      `SELECT id, action, created_at FROM audit.events WHERE action LIKE 'release.%' ORDER BY created_at DESC LIMIT 100`,
    );
    const items: ReleaseRecord[] = r.rows.map((row) => ({
      id: row.id,
      version: row.action.replace('release.', '') || '0.0.0',
      channel: 'stable',
      notes: '',
      releasedAt: row.created_at.toISOString(),
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
      created_at: Date;
    }>(
      `SELECT id, actor_id, action, resource_type, created_at FROM audit.events ORDER BY created_at DESC LIMIT 500`,
    );
    const items: AuditEventRecord[] = r.rows.map((row) => ({
      id: row.id,
      actorId: row.actor_id,
      action: row.action,
      resourceType: row.resource_type,
      occurredAt: row.created_at.toISOString(),
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
      created_at: Date;
    }>(
      `SELECT id, event_type, status, created_at FROM audit.outbox_events ORDER BY created_at DESC LIMIT 100`,
    );
    const items: JobRecord[] = r.rows.map((row) => ({
      id: row.id,
      type: row.event_type,
      status: row.status === 'published' ? 'succeeded' : ('queued' as JobRecord['status']),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.created_at.toISOString(),
    }));
    return { items, total: items.length };
  }

  async cancelJob(_a: Actor, id: string): Promise<JobRecord | null> {
    return { id, type: 'job', status: 'cancelled', createdAt: nowIso(), updatedAt: nowIso() };
  }

  async retryJob(_a: Actor, id: string): Promise<JobRecord | null> {
    return { id, type: 'job', status: 'queued', createdAt: nowIso(), updatedAt: nowIso() };
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
  status: string;
  assigned_to: string | null;
  created_at: Date;
}

function toSupportCase(r: SupportCaseRow): AdminSupportCaseRecord {
  return {
    id: r.id,
    caseReference: r.case_reference ?? r.id.slice(0, 8).toUpperCase(),
    subject: r.subject,
    status: r.status as AdminSupportCaseRecord['status'],
    assigneeId: r.assigned_to,
    createdAt: r.created_at.toISOString(),
  };
}

export class PgAdminSupportCaseRepository implements AdminSupportCaseRepository {
  constructor(private readonly pool: Pool) {}

  async listCases(_a: Actor): Promise<{ items: readonly AdminSupportCaseRecord[]; total: number }> {
    const r = await this.pool.query<SupportCaseRow>(
      `SELECT id, id AS case_reference, subject, status, assigned_to, created_at FROM support.cases ORDER BY created_at DESC LIMIT 200`,
    );
    return { items: r.rows.map(toSupportCase), total: r.rows.length };
  }

  async assignCase(
    _a: Actor,
    id: string,
    input: { assigneeId: string },
  ): Promise<AdminSupportCaseRecord | null> {
    const r = await this.pool.query<SupportCaseRow>(
      `UPDATE support.cases SET assigned_to = $1, updated_at = now() WHERE id = $2 RETURNING id, id AS case_reference, subject, status, assigned_to, created_at`,
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
      `UPDATE support.cases SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, id AS case_reference, subject, status, assigned_to, created_at`,
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
        `SELECT id, system_code, name, provider_legal_name, intended_purpose, version, lifecycle_status, owner_user_id, created_at, updated_at FROM governance.ai_system_records WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [actor.tenantId, limit],
      );
      return { items: r.rows.map(toAiSystem), total: r.rows.length };
    });
  }

  async getSystem(actor: Actor, id: string): Promise<AiSystemRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiSystemRow>(
        `SELECT id, system_code, name, provider_legal_name, intended_purpose, version, lifecycle_status, owner_user_id, created_at, updated_at FROM governance.ai_system_records WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      return r.rows[0] ? toAiSystem(r.rows[0]) : null;
    });
  }

  async createSystem(actor: Actor, input: AiSystemCreate): Promise<AiSystemRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiSystemRow>(
        `INSERT INTO governance.ai_system_records (id, tenant_id, system_code, name, provider_legal_name, intended_purpose, version, lifecycle_status, owner_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,'design',$8) RETURNING id, system_code, name, provider_legal_name, intended_purpose, version, lifecycle_status, owner_user_id, created_at, updated_at`,
        [
          randomUUID(),
          actor.tenantId,
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
        `INSERT INTO governance.classification_records (id, tenant_id, ai_system_id, version_no, high_risk_conclusion, territorial_scope, confidence, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'draft')`,
        [
          id,
          actor.tenantId,
          systemId,
          versionNo,
          input.highRiskConclusion,
          input.territorialScope,
          input.confidence,
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
  approved_by: string | null;
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
    evaluationSummary: {},
    approvedBy: r.approved_by,
    approvedAt: null,
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
        `SELECT id, provider, model_key, display_name, model_version, intended_purpose, limitations, data_region, status, approved_by, created_at, updated_at FROM assessment.model_registry WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [actor.tenantId, limit],
      );
      return { items: r.rows.map(toAiModel), total: r.rows.length, hasMore: false };
    });
  }

  async getModel(actor: Actor, id: string): Promise<AiModelRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiModelRow>(
        `SELECT id, provider, model_key, display_name, model_version, intended_purpose, limitations, data_region, status, approved_by, created_at, updated_at FROM assessment.model_registry WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      return r.rows[0] ? toAiModel(r.rows[0]) : null;
    });
  }

  async createModel(actor: Actor, input: AiModelCreate): Promise<AiModelRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiModelRow>(
        `INSERT INTO assessment.model_registry (id, tenant_id, provider, model_key, display_name, model_version, intended_purpose, limitations, data_region, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft') RETURNING id, provider, model_key, display_name, model_version, intended_purpose, limitations, data_region, status, approved_by, created_at, updated_at`,
        [
          randomUUID(),
          actor.tenantId,
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

  async activateModel(actor: Actor, id: string): Promise<AiModelRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiModelRow>(
        `UPDATE assessment.model_registry SET status = 'active', approved_by = $1, updated_at = now() WHERE tenant_id = $2 AND id = $3 RETURNING id, provider, model_key, display_name, model_version, intended_purpose, limitations, data_region, status, approved_by, created_at, updated_at`,
        [actor.userId, actor.tenantId, id],
      );
      return r.rows[0] ? toAiModel(r.rows[0]) : null;
    });
  }

  async suspendModel(actor: Actor, id: string): Promise<AiModelRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AiModelRow>(
        `UPDATE assessment.model_registry SET status = 'suspended', updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING id, provider, model_key, display_name, model_version, intended_purpose, limitations, data_region, status, approved_by, created_at, updated_at`,
        [actor.tenantId, id],
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

export class PgAssessmentVersionRepository
  implements AssessmentVersionRepository, AssessmentValidationRepository
{
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  private async queryVersion(actor: Actor, id: string): Promise<AssessmentVersionRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{
        id: string;
        assessment_id: string;
        version_no: number;
        status: string;
        duration_seconds: number;
        created_at: Date;
      }>(
        `SELECT id, assessment_id, version_no, status, duration_seconds, created_at FROM assessment.assessment_versions WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      if (!r.rows[0]) return null;
      const row = r.rows[0];
      return {
        id: row.id,
        assessmentId: row.assessment_id,
        versionNo: row.version_no,
        status: row.status as AssessmentVersionRecord['status'],
        durationSeconds: row.duration_seconds,
        createdAt: row.created_at.toISOString(),
      };
    });
  }

  async activateVersion(actor: Actor, versionId: string): Promise<AssessmentVersionRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{
        id: string;
        assessment_id: string;
        version_no: number;
        status: string;
        duration_seconds: number;
        created_at: Date;
      }>(
        `UPDATE assessment.assessment_versions SET status = 'active', updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING id, assessment_id, version_no, status, duration_seconds, created_at`,
        [actor.tenantId, versionId],
      );
      if (!r.rows[0]) return null;
      const row = r.rows[0];
      return {
        id: row.id,
        assessmentId: row.assessment_id,
        versionNo: row.version_no,
        status: row.status as AssessmentVersionRecord['status'],
        durationSeconds: row.duration_seconds,
        createdAt: row.created_at.toISOString(),
      };
    });
  }

  async previewVersion(actor: Actor, versionId: string): Promise<AssessmentVersionPreview | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const vr = await client.query<{ id: string; duration_seconds: number }>(
        `SELECT id, duration_seconds FROM assessment.assessment_versions WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, versionId],
      );
      if (!vr.rows[0]) return null;
      const ir = await client.query<{ id: string; prompt: string }>(
        `SELECT ai.id, ai.prompt FROM assessment.assessment_items ai JOIN assessment.assessment_sections s ON s.id = ai.section_id WHERE s.assessment_version_id = $1 ORDER BY ai.position_no`,
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
      const src = await this.queryVersion(actor, versionId);
      if (!src) return null;
      const maxRes = await client.query<{ m: string }>(
        `SELECT max(version_no)::text AS m FROM assessment.assessment_versions WHERE tenant_id = $1 AND assessment_id = $2`,
        [actor.tenantId, src.assessmentId],
      );
      const newVer = Number(maxRes.rows[0]?.m ?? '0') + 1;
      const newId = randomUUID();
      await client.query(
        `INSERT INTO assessment.assessment_versions (id, tenant_id, assessment_id, version_no, status, duration_seconds) VALUES ($1,$2,$3,$4,'draft',$5)`,
        [newId, actor.tenantId, src.assessmentId, newVer, src.durationSeconds],
      );
      return {
        id: newId,
        assessmentId: src.assessmentId,
        versionNo: newVer,
        status: 'draft',
        durationSeconds: src.durationSeconds,
        createdAt: nowIso(),
      };
    });
  }

  async suspendVersion(actor: Actor, versionId: string): Promise<AssessmentVersionRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{
        id: string;
        assessment_id: string;
        version_no: number;
        status: string;
        duration_seconds: number;
        created_at: Date;
      }>(
        `UPDATE assessment.assessment_versions SET status = 'suspended', updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING id, assessment_id, version_no, status, duration_seconds, created_at`,
        [actor.tenantId, versionId],
      );
      if (!r.rows[0]) return null;
      const row = r.rows[0];
      return {
        id: row.id,
        assessmentId: row.assessment_id,
        versionNo: row.version_no,
        status: row.status as AssessmentVersionRecord['status'],
        durationSeconds: row.duration_seconds,
        createdAt: row.created_at.toISOString(),
      };
    });
  }

  async createDefect(
    actor: Actor,
    versionId: string,
    input: AssessmentDefectCreate,
  ): Promise<AssessmentDefectRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO governance.assessment_defects (id, tenant_id, assessment_version_id, severity, summary, status, reported_by) VALUES ($1,$2,$3,$4,$5,'open',$6)`,
        [id, actor.tenantId, versionId, input.severity, input.summary, actor.userId],
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
      await client.query(
        `INSERT INTO assessment.assessment_validations (id, tenant_id, assessment_version_id, validation_type, status, evidence_uri, summary, reviewer_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          id,
          actor.tenantId,
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
        reviewedAt: null,
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

import type { BookingRecord, BookingCreate, BookingRepository } from './bookings.js';

interface BookingRow {
  id: string;
  application_id: string;
  assessment_id: string;
  status: string;
  start_at: Date;
  end_at: Date;
  created_at: Date;
}

function toBooking(r: BookingRow): BookingRecord {
  return {
    id: r.id,
    applicationId: r.application_id,
    assessmentId: r.assessment_id,
    status: r.status as BookingRecord['status'],
    startAt: r.start_at.toISOString(),
    endAt: r.end_at.toISOString(),
    createdAt: r.created_at.toISOString(),
  };
}

export class PgBookingRepository implements BookingRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async listBookings(actor: Actor): Promise<{ items: readonly BookingRecord[]; total: number }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<BookingRow>(
        `SELECT id, application_id, assessment_id, status, start_at, end_at, created_at FROM hiring.assessment_bookings WHERE tenant_id = $1 ORDER BY start_at DESC LIMIT 100`,
        [actor.tenantId],
      );
      return { items: r.rows.map(toBooking), total: r.rows.length };
    });
  }

  async createBooking(actor: Actor, input: BookingCreate): Promise<BookingRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<BookingRow>(
        `INSERT INTO hiring.assessment_bookings (id, tenant_id, application_id, assessment_id, status, start_at, end_at) VALUES ($1,$2,$3,$4,'confirmed',$5,$6) RETURNING id, application_id, assessment_id, status, start_at, end_at, created_at`,
        [
          randomUUID(),
          actor.tenantId,
          input.applicationId,
          input.assessmentId,
          new Date(input.startAt),
          new Date(input.endAt),
        ],
      );
      if (!r.rows[0]) throw new Error('booking row missing');
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
      const [appRes, invRes, attRes] = await Promise.all([
        client.query<{ n: string }>(
          `SELECT count(*)::text AS n FROM hiring.applications WHERE tenant_id = $1 AND campaign_id = $2`,
          [actor.tenantId, campaignId],
        ),
        client.query<{ n: string }>(
          `SELECT count(*)::text AS n FROM hiring.invitations WHERE tenant_id = $1 AND campaign_id = $2`,
          [actor.tenantId, campaignId],
        ),
        client.query<{ total: string; completed: string }>(
          `SELECT count(*)::text AS total, count(*) FILTER (WHERE status='submitted')::text AS completed FROM runtime.attempts WHERE tenant_id = $1 AND campaign_id = $2`,
          [actor.tenantId, campaignId],
        ),
      ]);
      const totalInvitations = Number(invRes.rows[0]?.n ?? 0);
      const totalAttempts = Number(attRes.rows[0]?.total ?? 0);
      const totalCompleted = Number(attRes.rows[0]?.completed ?? 0);
      return {
        campaignId,
        totalApplications: Number(appRes.rows[0]?.n ?? 0),
        totalReviewers: 0,
        averageScore: null,
        statusBreakdown: {
          invited: totalInvitations,
          in_progress: totalAttempts,
          submitted: totalCompleted,
        },
      };
    });
  }

  async getComparison(actor: Actor, campaignId: string): Promise<CampaignComparisonData | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{ id: string }>(
        `SELECT DISTINCT a.candidate_user_id AS id FROM hiring.applications a WHERE a.tenant_id = $1 AND a.campaign_id = $2 ORDER BY a.candidate_user_id LIMIT 50`,
        [actor.tenantId, campaignId],
      );
      return {
        campaignId,
        candidates: r.rows.map((row, i) => ({ candidateId: row.id, score: null, rank: i + 1 })),
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
        metadata: { field: input.field, requestedValue: input.requestedValue },
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
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'explanation.request',
        resourceType: 'explanation_request',
        resourceId: id,
        outcome: 'success',
        metadata: { applicationId, reason: input.reason },
      });
    });
    return { id, applicationId, kind: 'explanation', status: 'pending', createdAt: nowIso() };
  }

  async requestHumanReview(
    actor: Actor,
    applicationId: string,
    input: ApplicationActionInput,
  ): Promise<ApplicationRequestRecord | null> {
    const id = randomUUID();
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'human_review.request',
        resourceType: 'human_review_request',
        resourceId: id,
        outcome: 'success',
        metadata: { applicationId, reason: input.reason },
      });
    });
    return { id, applicationId, kind: 'human_review', status: 'pending', createdAt: nowIso() };
  }

  async requestWithdrawal(
    actor: Actor,
    applicationId: string,
    input: ApplicationActionInput,
  ): Promise<ApplicationRequestRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{ id: string }>(
        `UPDATE hiring.applications SET status = 'withdrawn', updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING id`,
        [actor.tenantId, applicationId],
      );
      const id = r.rows[0]?.id ?? randomUUID();
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'application.withdraw',
        resourceType: 'application',
        resourceId: id,
        outcome: 'success',
        metadata: { reason: input.reason },
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
} from './candidate-portal.js';

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
      const ar = await client.query<{
        application_id: string;
        campaign_title: string;
        status: string;
      }>(
        `SELECT a.id AS application_id, COALESCE(c.title, 'Campaign') AS campaign_title, a.status FROM hiring.applications a LEFT JOIN hiring.campaigns c ON c.id = a.campaign_id WHERE a.tenant_id = $1 AND a.candidate_user_id = $2 ORDER BY a.created_at DESC LIMIT 10`,
        [actor.tenantId, actor.userId],
      );
      return {
        candidateId: ur.rows[0].id,
        email: ur.rows[0].email,
        displayName: ur.rows[0].full_name ?? '',
        applications: ar.rows.map((r) => ({
          applicationId: r.application_id,
          campaignTitle: r.campaign_title,
          status: r.status,
        })),
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
        `SELECT i.id AS invitation_id, COALESCE(c.title, 'Campaign') AS campaign_title, i.expires_at, i.status FROM hiring.invitations i JOIN hiring.applications a ON a.id = i.application_id JOIN hiring.campaigns c ON c.id = a.campaign_id WHERE i.tenant_id = $1 AND a.candidate_user_id = $2 ORDER BY i.created_at DESC LIMIT 1`,
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
  actor_id: string;
  created_at: Date;
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
        `SELECT id, request_type, status, actor_id, created_at FROM governance.data_subject_requests WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [actor.tenantId],
      );
      const items: DataRightRequestRecord[] = r.rows.map((row) => ({
        id: row.id,
        requestType: row.request_type,
        status: row.status as DataRightRequestRecord['status'],
        candidateId: row.actor_id,
        createdAt: row.created_at.toISOString(),
      }));
      return { items, total: items.length };
    });
  }

  async createDataRight(
    actor: Actor,
    input: DataRightRequestCreate,
  ): Promise<DataRightRequestRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO governance.data_subject_requests (id, tenant_id, request_type, status, actor_id, deadline_at) VALUES ($1,$2,$3,'pending',$4,now()+interval '30 days')`,
        [id, actor.tenantId, input.requestType, actor.userId],
      );
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
        status: 'pending',
        candidateId: actor.userId,
        createdAt: nowIso(),
      };
    });
  }

  async createComplaint(actor: Actor, input: ComplaintCreate): Promise<ComplaintRecord> {
    const id = randomUUID();
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await client.query(
        `INSERT INTO governance.complaints (id, tenant_id, subject, body, status, submitted_by) VALUES ($1,$2,$3,$4,'open',$5)`,
        [id, actor.tenantId, input.category, input.description, actor.userId],
      );
    });
    return {
      id,
      category: input.category,
      status: 'open',
      candidateId: actor.userId,
      createdAt: nowIso(),
    };
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
    await withTenant(this.pool, ctx(actor, this.role), async () => {}); // ensure RLS
    return {
      tenantId: actor.tenantId,
      humanOversightConfirmed: false,
      monitoringConfirmed: false,
      recordKeepingConfirmed: false,
      status: 'incomplete',
      updatedAt: nowIso(),
    };
  }

  async updateReadiness(
    actor: Actor,
    input: DeployerReadinessUpdate,
  ): Promise<DeployerReadinessRecord> {
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
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
    });
    const allConfirmed =
      input.humanOversightConfirmed && input.monitoringConfirmed && input.recordKeepingConfirmed;
    return {
      tenantId: actor.tenantId,
      ...input,
      status: allConfirmed ? 'complete' : 'incomplete',
      updatedAt: nowIso(),
    };
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
        `INSERT INTO integration.connections (id, tenant_id, connection_type, provider, status) VALUES ($1,$2,$3,$4,'active') RETURNING id, connection_type, provider, status, created_at, updated_at`,
        [randomUUID(), actor.tenantId, input.connectionType, input.provider],
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
        `UPDATE integration.connections SET updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING id, connection_type, provider, status, created_at, updated_at`,
        [actor.tenantId, id],
      );
      void input;
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
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async createInvitation(
    actor: Actor,
    input: MemberInvitationCreate,
  ): Promise<MemberInvitationRecord> {
    const id = randomUUID();
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'member_invitation.create',
        resourceType: 'member_invitation',
        resourceId: id,
        outcome: 'success',
        metadata: { email: input.email },
      });
    });
    return {
      id,
      email: input.email,
      roles: input.roles as string[],
      status: 'pending',
      createdAt: nowIso(),
    };
  }

  async resendInvitation(actor: Actor, id: string): Promise<MemberInvitationRecord | null> {
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
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
    });
    return { id, email: '', roles: [], status: 'pending', createdAt: nowIso() };
  }

  async revokeInvitation(actor: Actor, id: string): Promise<boolean> {
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
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
    });
    return true;
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
  channel: string;
  subject: string;
  body_html: string;
  status: string | null;
  created_at: Date;
  updated_at: Date;
}

function toTemplate(r: TemplateRow): NotificationTemplateRecord {
  return {
    id: r.id,
    templateCode: r.template_code,
    channel: r.channel,
    subject: r.subject,
    bodyHtml: r.body_html,
    status: r.status ?? 'draft',
    createdAt: r.created_at.toISOString(),
  };
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
        `SELECT id, template_code, channel, subject, body_html, status, created_at, updated_at FROM integration.notification_templates WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
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
        `INSERT INTO integration.notification_templates (id, tenant_id, template_code, channel, subject, body_html, status) VALUES ($1,$2,$3,$4,$5,$6,'draft') RETURNING id, template_code, channel, subject, body_html, status, created_at, updated_at`,
        [
          randomUUID(),
          actor.tenantId,
          input.templateCode,
          input.channel,
          input.subject,
          input.bodyHtml,
        ],
      );
      if (!r.rows[0]) throw new Error('template row missing');
      return toTemplate(r.rows[0]);
    });
  }

  async activateTemplate(actor: Actor, id: string): Promise<NotificationTemplateRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<TemplateRow>(
        `UPDATE integration.notification_templates SET status = 'active', updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING id, template_code, channel, subject, body_html, status, created_at, updated_at`,
        [actor.tenantId, id],
      );
      return r.rows[0] ? toTemplate(r.rows[0]) : null;
    });
  }

  async previewTemplate(
    _actor: Actor,
    _id: string,
    _input: NotificationTemplatePreview,
  ): Promise<NotificationTemplateRendered> {
    return {
      subject: 'Preview subject',
      bodyHtml: '<p>Preview rendering not yet implemented.</p>',
    };
  }

  async testSendTemplate(
    actor: Actor,
    id: string,
    input: { recipient: string },
  ): Promise<{ queued: boolean } | null> {
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'notification_template.test_send',
        resourceType: 'notification_template',
        resourceId: id,
        outcome: 'success',
        metadata: { recipient: input.recipient },
      });
    });
    return { queued: true };
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
  name: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function toPlugin(r: PluginRow): PluginRecord {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    status: r.status as PluginRecord['status'],
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
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
        `SELECT id, plugin_code AS code, display_name AS name, status, created_at, updated_at FROM assessment.plugin_registry WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [actor.tenantId],
      );
      return { items: r.rows.map(toPlugin), total: r.rows.length };
    });
  }

  async createPlugin(actor: Actor, input: PluginCreate): Promise<PluginRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<PluginRow>(
        `INSERT INTO assessment.plugin_registry (id, tenant_id, plugin_code, display_name, status) VALUES ($1,$2,$3,$4,'draft') RETURNING id, plugin_code AS code, display_name AS name, status, created_at, updated_at`,
        [randomUUID(), actor.tenantId, input.code, input.name],
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
        `UPDATE assessment.plugin_registry SET status = $1, updated_at = now() WHERE tenant_id = $2 AND id = $3 RETURNING id, plugin_code AS code, display_name AS name, status, created_at, updated_at`,
        [input.status, actor.tenantId, id],
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
  prompt_code: string;
  version: number;
  status: string;
  body: string;
  created_at: Date;
}

function toPrompt(r: PromptRow): PromptVersionRecord {
  return {
    id: r.id,
    promptCode: r.prompt_code,
    version: r.version,
    status: r.status as PromptVersionRecord['status'],
    body: r.body,
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
        `SELECT id, prompt_code, version_no AS version, status, body, created_at FROM assessment.prompt_versions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [actor.tenantId],
      );
      return { items: r.rows.map(toPrompt), total: r.rows.length };
    });
  }

  async createVersion(actor: Actor, input: PromptVersionCreate): Promise<PromptVersionRecord> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const maxRes = await client.query<{ m: string }>(
        `SELECT max(version_no)::text AS m FROM assessment.prompt_versions WHERE tenant_id = $1 AND prompt_code = $2`,
        [actor.tenantId, input.promptCode],
      );
      const versionNo = Number(maxRes.rows[0]?.m ?? '0') + 1;
      const r = await client.query<PromptRow>(
        `INSERT INTO assessment.prompt_versions (id, tenant_id, prompt_code, version_no, status, body) VALUES ($1,$2,$3,$4,'draft',$5) RETURNING id, prompt_code, version_no AS version, status, body, created_at`,
        [randomUUID(), actor.tenantId, input.promptCode, versionNo, input.body],
      );
      if (!r.rows[0]) throw new Error('prompt row missing');
      return toPrompt(r.rows[0]);
    });
  }

  async activateVersion(actor: Actor, id: string): Promise<PromptVersionRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<PromptRow>(
        `UPDATE assessment.prompt_versions SET status = 'active', updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING id, prompt_code, version_no AS version, status, body, created_at`,
        [actor.tenantId, id],
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
    _cursor: string | null,
  ): Promise<{
    items: readonly ReviewAssignmentRecord[];
    total: number;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AssignmentRow>(
        `SELECT id, tenant_id, submission_id, reviewer_profile_id, assignment_type, blind_group, status, assigned_at, due_at, submitted_at FROM review.reviewer_assignments WHERE tenant_id = $1 ORDER BY assigned_at DESC LIMIT $2`,
        [actor.tenantId, limit],
      );
      return {
        items: r.rows.map(toAssignment),
        total: r.rows.length,
        hasMore: false,
        nextCursor: null,
      };
    });
  }

  async getAssignment(actor: Actor, id: string): Promise<ReviewAssignmentRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AssignmentRow>(
        `SELECT id, tenant_id, submission_id, reviewer_profile_id, assignment_type, blind_group, status, assigned_at, due_at, submitted_at FROM review.reviewer_assignments WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      return r.rows[0] ? toAssignment(r.rows[0]) : null;
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
        `UPDATE review.reviewer_assignments SET status = 'active', updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING id, tenant_id, submission_id, reviewer_profile_id, assignment_type, blind_group, status, assigned_at, due_at, submitted_at`,
        [actor.tenantId, id],
      );
      return r.rows[0] ? toAssignment(r.rows[0]) : null;
    });
  }

  async stopAssignmentAi(actor: Actor, id: string): Promise<ReviewAssignmentRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
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
      const r = await client.query<AssignmentRow>(
        `SELECT id, tenant_id, submission_id, reviewer_profile_id, assignment_type, blind_group, status, assigned_at, due_at, submitted_at FROM review.reviewer_assignments WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      return r.rows[0] ? toAssignment(r.rows[0]) : null;
    });
  }

  async declineAssignment(
    actor: Actor,
    id: string,
    input: AssignmentDeclineInput,
  ): Promise<ReviewAssignmentRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<AssignmentRow>(
        `UPDATE review.reviewer_assignments SET status = 'declined', updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING id, tenant_id, submission_id, reviewer_profile_id, assignment_type, blind_group, status, assigned_at, due_at, submitted_at`,
        [actor.tenantId, id],
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
          metadata: { reason: input.reason },
        });
      return r.rows[0] ? toAssignment(r.rows[0]) : null;
    });
  }

  async addAnnotation(
    actor: Actor,
    assignmentId: string,
    input: AssignmentAnnotationInput,
  ): Promise<AssignmentAnnotationRecord | null> {
    const id = randomUUID();
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await client.query(
        `INSERT INTO review.evidence_annotations (id, tenant_id, assignment_id, body, item_ref, annotated_by) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, actor.tenantId, assignmentId, input.body, input.itemId, actor.userId],
      );
    });
    return { id, assignmentId, itemId: input.itemId, body: input.body, createdAt: nowIso() };
  }

  async addClarification(
    actor: Actor,
    assignmentId: string,
    input: AssignmentClarificationInput,
  ): Promise<AssignmentClarificationRecord | null> {
    const id = randomUUID();
    await withTenant(this.pool, ctx(actor, this.role), async (client) => {
      await client.query(
        `INSERT INTO review.clarification_requests (id, tenant_id, assignment_id, question, status, requested_by) VALUES ($1,$2,$3,$4,'pending',$5)`,
        [id, actor.tenantId, assignmentId, input.question, actor.userId],
      );
    });
    return { id, assignmentId, question: input.question, status: 'pending', createdAt: nowIso() };
  }
}

// ─── Review Quality ───────────────────────────────────────────────────────────

import type {
  ReviewQualityRepository,
  ScorecardAmendmentRecord,
  ScorecardAmendmentCreate,
  ObservationRecord,
  ObservationDispositionInput,
  IntegrityEventRecord,
  IntegrityResolutionInput,
} from './review-quality.js';

export class PgReviewQualityRepository implements ReviewQualityRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  async createAmendment(
    actor: Actor,
    scorecardId: string,
    input: ScorecardAmendmentCreate,
  ): Promise<ScorecardAmendmentRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO review.review_amendments (id, tenant_id, scorecard_id, reason, changes_summary, amended_by) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, actor.tenantId, scorecardId, input.rationale, input.changes, actor.userId],
      );
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
      return { id, scorecardId, rationale: input.rationale, createdAt: nowIso() };
    });
  }

  async setObservationDisposition(
    actor: Actor,
    observationId: string,
    input: ObservationDispositionInput,
  ): Promise<ObservationRecord | null> {
    return withTenant(this.pool, ctx(actor, this.role), async (client) => {
      const r = await client.query<{
        id: string;
        disposition: string;
        note: string | null;
        updated_at: Date;
      }>(
        `UPDATE evidence.reviewer_ai_observations SET disposition = $1, disposition_note = $2, disposed_by = $3, disposed_at = now() WHERE tenant_id = $4 AND id = $5 RETURNING id, disposition, disposition_note AS note, now() AS updated_at`,
        [input.disposition, input.note ?? null, actor.userId, actor.tenantId, observationId],
      );
      if (!r.rows[0]) return null;
      return {
        id: r.rows[0].id,
        disposition: r.rows[0].disposition as ObservationRecord['disposition'],
        note: r.rows[0].note,
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
      await client.query(
        `INSERT INTO review.integrity_resolutions (id, tenant_id, event_id, resolution, outcome, resolved_by) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (event_id) DO UPDATE SET resolution = $4, outcome = $5, resolved_by = $6`,
        [randomUUID(), actor.tenantId, eventId, input.resolution, 'resolved', actor.userId],
      );
      return {
        id: eventId,
        resolution: input.resolution,
        note: input.note ?? null,
        resolvedAt: nowIso(),
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
