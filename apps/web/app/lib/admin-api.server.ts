import 'server-only';

import type {
  AdminSupportCaseView,
  AiEvaluationView,
  AiModelDetailView,
  AiModelView,
  AssessmentDetailView,
  AssessmentPreviewView,
  AssessmentValidationView,
  AssessmentVersionView,
  AssessmentView,
  AuditEventView,
  Collection,
  FeatureFlagView,
  DefectView,
  JobView,
  PluginView,
  PromptVersionView,
  ReleaseView,
  TenantDetailView,
  TenantStaffView,
  TenantView,
} from './types';

export interface PlatformTenant {
  readonly id: string;
  readonly slug: string;
  readonly legalName: string;
  readonly status: string;
  readonly dataRegion: string;
  readonly subscriptionPlanId: string | null;
  readonly subscriptionPlanName?: string | null;
  readonly staffCount?: number;
  readonly seatsUsed?: number;
  readonly seatsLimit?: number;
  readonly subscriptionStartsAt?: string | null;
  readonly subscriptionEndsAt?: string | null;
  readonly createdAt: string;
}

function tenantStatus(status: string): TenantView['status'] {
  if (status === 'active') return 'active';
  if (status === 'suspended') return 'suspended';
  if (status === 'terminated') return 'archived';
  return 'trial';
}

export function tenant(item: PlatformTenant): TenantView {
  return {
    id: item.id,
    name: item.legalName,
    slug: item.slug,
    status: tenantStatus(item.status),
    plan: item.subscriptionPlanName ?? item.subscriptionPlanId ?? 'Unassigned',
    staffCount: item.staffCount ?? 0,
    createdAt: item.createdAt,
  };
}

export function tenants(data: {
  readonly items: readonly PlatformTenant[];
  readonly total: number;
}): Collection<TenantView> {
  return { items: data.items.map(tenant), total: data.total };
}

export function tenantDetail(item: PlatformTenant): TenantDetailView {
  return {
    id: item.id,
    name: item.legalName,
    slug: item.slug,
    status: tenantStatus(item.status),
    plan: item.subscriptionPlanName ?? item.subscriptionPlanId ?? 'Unassigned',
    region: item.dataRegion,
    seatsUsed: item.seatsUsed ?? item.staffCount ?? 0,
    seatsLimit: item.seatsLimit ?? 0,
  };
}

export interface PlatformStaff {
  readonly userId?: string;
  readonly id?: string;
  readonly email: string;
  readonly displayName?: string;
  readonly roles: readonly string[];
  readonly status: string;
}

export function staff(item: PlatformStaff): TenantStaffView {
  return {
    id: item.userId ?? item.id ?? '',
    name: item.displayName || item.email,
    email: item.email,
    role: item.roles.join(', '),
    status:
      item.status === 'suspended' ? 'suspended' : item.status === 'active' ? 'active' : 'invited',
  };
}

export interface PlatformFlag {
  readonly id: string;
  readonly key: string;
  readonly description: string;
  readonly enabled: boolean;
}

export function featureFlag(item: PlatformFlag): FeatureFlagView {
  return {
    id: item.id,
    key: item.key,
    description: item.description,
    enabled: item.enabled,
    rollout: item.enabled ? '100%' : '0%',
  };
}

export function featureFlags(data: {
  readonly items: readonly PlatformFlag[];
  readonly total: number;
}): Collection<FeatureFlagView> {
  return { items: data.items.map(featureFlag), total: data.total };
}

export interface PlatformJob {
  readonly id: string;
  readonly type: string;
  readonly status: string;
  readonly attemptCount?: number;
  readonly createdAt: string;
}

export function job(item: PlatformJob): JobView {
  return {
    id: item.id,
    name: item.type,
    status:
      item.status === 'succeeded'
        ? 'complete'
        : item.status === 'running'
          ? 'running'
          : item.status === 'failed'
            ? 'failed'
            : item.status === 'cancelled'
              ? 'cancelled'
              : 'queued',
    attempts: item.attemptCount ?? 0,
    queuedAt: item.createdAt,
  };
}

export interface PlatformAuditEvent {
  readonly id: string;
  readonly actorId: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly occurredAt: string;
}

export function auditEvent(item: PlatformAuditEvent): AuditEventView {
  return {
    id: item.id,
    actor: item.actorId,
    action: item.action,
    target: item.resourceId ?? item.resourceType,
    at: item.occurredAt,
  };
}

export interface PlatformRelease {
  readonly id: string;
  readonly version: string;
  readonly channel: string;
  readonly notes: string;
  readonly releasedAt: string;
}

export interface PlatformMaintenance {
  readonly id: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly description: string;
  readonly status: string;
}

export function releases(
  releaseItems: readonly PlatformRelease[],
  windows: readonly PlatformMaintenance[],
): Collection<ReleaseView> {
  const items: ReleaseView[] = [
    ...windows.map((item) => ({
      id: item.id,
      title: item.description,
      kind: 'maintenance' as const,
      status:
        item.status === 'completed'
          ? ('complete' as const)
          : item.status === 'cancelled'
            ? ('cancelled' as const)
            : ('scheduled' as const),
      window: `${item.startsAt} – ${item.endsAt}`,
    })),
    ...releaseItems.map((item) => ({
      id: item.id,
      title: item.notes || `Release ${item.version}`,
      kind: 'release' as const,
      status: 'complete' as const,
      window: item.releasedAt,
    })),
  ];
  return { items, total: items.length };
}

export interface PlatformAdminSupportCase {
  readonly id: string;
  readonly subject: string;
  readonly status: string;
  readonly assigneeId: string | null;
  readonly tenantName?: string;
  readonly severity?: string;
  readonly caseReference?: string;
  readonly category?: string;
  readonly requesterUserId?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export function adminSupportCase(item: PlatformAdminSupportCase): AdminSupportCaseView {
  return {
    id: item.id,
    subject: item.subject,
    tenantName: item.tenantName ?? 'Platform tenant',
    priority:
      item.severity === 'critical'
        ? 'urgent'
        : item.severity === 'high'
          ? 'high'
          : item.severity === 'low'
            ? 'low'
            : 'normal',
    status:
      item.status === 'resolved' || item.status === 'closed'
        ? 'resolved'
        : item.status === 'open' && item.assigneeId === null
          ? 'new'
          : item.status === 'open'
            ? 'assigned'
            : 'in_progress',
    assignee: item.assigneeId,
  };
}

export interface PlatformAiModel {
  readonly id: string;
  readonly provider: string;
  readonly modelKey: string;
  readonly displayName: string;
  readonly modelVersion: string;
  readonly intendedPurpose: string;
  readonly limitations: string;
  readonly status: string;
  readonly evaluationSummary: Readonly<Record<string, unknown>>;
  readonly approvedBy: string | null;
}

function modelStatus(status: string): AiModelView['status'] {
  if (status === 'evaluating') return 'in_evaluation';
  if (status === 'approved') return 'approved';
  if (status === 'active') return 'active';
  if (status === 'suspended') return 'suspended';
  return 'registered';
}

export function aiModel(item: PlatformAiModel): AiModelView {
  return {
    id: item.id,
    name: item.displayName,
    provider: item.provider,
    useCase: item.intendedPurpose,
    status: modelStatus(item.status),
    limitations: item.limitations,
  };
}

export function aiModelDetail(item: PlatformAiModel): AiModelDetailView {
  return {
    ...aiModel(item),
    reference: `${item.provider}/${item.modelKey}@${item.modelVersion}`,
    evaluationRecorded: Object.keys(item.evaluationSummary).length > 0,
    approvals: item.approvedBy === null ? 0 : 1,
    approvalsRequired: 1,
  };
}

export function aiEvaluation(item: PlatformAiModel): AiEvaluationView {
  const summary = item.evaluationSummary;
  const outcome = typeof summary.outcome === 'string' ? summary.outcome : null;
  const rationale = typeof summary.rationale === 'string' ? summary.rationale : null;
  const dimensions = ['quality', 'safety', 'fairness', 'privacy'].map((name) => ({
    id: name,
    label: name[0]?.toUpperCase() + name.slice(1),
    status:
      outcome === null
        ? ('pending' as const)
        : outcome === 'failed'
          ? ('fail' as const)
          : ('pass' as const),
  }));
  return {
    modelId: item.id,
    dimensions,
    recorded: outcome !== null,
    outcome,
    rationale,
  };
}

export interface PlatformAssessmentVersion {
  readonly id: string;
  readonly assessmentId: string;
  readonly versionNo: number;
  readonly status: string;
  readonly createdAt: string;
  readonly validations?: readonly {
    readonly id: string;
    readonly validationType: string;
    readonly status: string;
    readonly summary: string | null;
  }[];
}

export interface PlatformAssessment {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly targetRole: string;
  readonly ownerUserId: string;
  readonly lifecycleStatus: string;
  readonly updatedAt: string;
  readonly versions?: readonly PlatformAssessmentVersion[];
  readonly defects?: readonly {
    readonly id: string;
    readonly assessmentVersionId: string;
    readonly defectType: string;
    readonly severity: string;
    readonly description: string;
    readonly status: string;
  }[];
}

export function assessmentDefects(item: PlatformAssessment): readonly DefectView[] {
  return (item.defects ?? []).map((defect) => ({
    id: defect.id,
    title: defect.description,
    severity:
      defect.severity === 'critical' || defect.severity === 'high' || defect.severity === 'medium'
        ? defect.severity
        : 'low',
    status:
      defect.status === 'resolved' || defect.status === 'closed'
        ? 'resolved'
        : defect.status === 'triaged' || defect.status === 'impact_analysis'
          ? 'triaged'
          : 'open',
    scope: defect.assessmentVersionId,
    owner: item.ownerUserId,
  }));
}

function assessmentStatus(status: string): AssessmentView['status'] {
  if (status === 'active') return 'active';
  if (status === 'suspended') return 'suspended';
  if (status === 'retired') return 'retired';
  if (status === 'draft') return 'draft';
  return 'in_review';
}

export function assessment(item: PlatformAssessment): AssessmentView {
  return {
    id: item.id,
    name: item.title,
    roleFamily: item.targetRole,
    riskTier: 'high',
    status: assessmentStatus(item.lifecycleStatus),
    owner: item.ownerUserId,
    updatedAt: item.updatedAt,
  };
}

export function assessmentVersion(item: PlatformAssessmentVersion): AssessmentVersionView {
  return {
    id: item.id,
    assessmentId: item.assessmentId,
    label: `Version ${String(item.versionNo)}`,
    status:
      item.status === 'active'
        ? 'active'
        : item.status === 'suspended'
          ? 'suspended'
          : item.validations?.some((validation) =>
                ['passed', 'passed_with_conditions'].includes(validation.status),
              ) === true
            ? 'validated'
            : 'draft',
    effectiveDate: item.createdAt,
    rationale: '',
    validationResolved:
      item.validations?.some((validation) =>
        ['passed', 'passed_with_conditions'].includes(validation.status),
      ) ?? false,
  };
}

export function assessmentDetail(item: PlatformAssessment): AssessmentDetailView {
  return {
    id: item.id,
    name: item.title,
    status: assessmentStatus(item.lifecycleStatus),
    owner: item.ownerUserId,
    reference: item.code,
    riskTier: 'high',
    versions: (item.versions ?? []).map(assessmentVersion),
  };
}

export function assessmentValidation(version: PlatformAssessmentVersion): AssessmentValidationView {
  const validations = version.validations ?? [];
  const checks = [
    'job_relevance',
    'accessibility',
    'privacy',
    'security',
    'fairness',
    'technical',
  ].map((validationType) => {
    const record = validations.find((item) => item.validationType === validationType);
    return {
      id: validationType,
      label: validationType.replaceAll('_', ' '),
      status:
        record === undefined || record.status === 'pending'
          ? ('pending' as const)
          : record.status === 'failed'
            ? ('fail' as const)
            : ('pass' as const),
    };
  });
  const resolved = checks.every((check) => check.status === 'pass');
  return {
    versionId: version.id,
    checks,
    resolved,
    outcome: resolved ? 'passed' : null,
    rationale: validations.find((validation) => validation.summary !== null)?.summary ?? null,
  };
}

export interface PlatformAssessmentPreview {
  readonly versionId: string;
  readonly items: readonly { readonly id: string; readonly prompt: unknown }[];
}

function promptText(prompt: unknown): string {
  if (typeof prompt === 'string') return prompt;
  if (prompt !== null && typeof prompt === 'object') {
    const text = (prompt as Record<string, unknown>).text;
    if (typeof text === 'string') return text;
  }
  return 'Structured assessment task';
}

export function assessmentPreview(
  preview: PlatformAssessmentPreview,
  assessmentName: string,
): AssessmentPreviewView {
  return {
    versionId: preview.versionId,
    assessmentName,
    sections: [
      {
        title: 'Assessment tasks',
        tasks: preview.items.map((item) => promptText(item.prompt)),
      },
    ],
  };
}

export interface PlatformPlugin {
  readonly id: string;
  readonly code: string;
  readonly provider: string;
  readonly name: string;
  readonly version: string;
  readonly permissions: Readonly<Record<string, unknown>>;
  readonly status: string;
}

export function plugin(item: PlatformPlugin): PluginView {
  const capabilities = Array.isArray(item.permissions.capabilities)
    ? item.permissions.capabilities.filter(
        (value): value is string => typeof value === 'string' && value.trim() !== '',
      )
    : [];
  const dataScope =
    typeof item.permissions.dataScope === 'string' ? item.permissions.dataScope : 'none declared';
  return {
    id: item.id,
    name: item.name,
    capabilities,
    dataScope,
    status:
      item.status === 'approved' || item.status === 'active'
        ? 'approved'
        : item.status === 'suspended' || item.status === 'retired'
          ? 'suspended'
          : 'registered',
  };
}

export interface PlatformPrompt {
  readonly id: string;
  readonly promptCode: string;
  readonly version: number;
  readonly status: string;
  readonly createdAt: string;
}

export function prompt(item: PlatformPrompt): PromptVersionView {
  return {
    id: item.id,
    name: item.promptCode,
    version: item.version,
    status:
      item.status === 'active' ? 'active' : item.status === 'retired' ? 'rolled_back' : 'draft',
    immutable: item.status !== 'draft',
    createdAt: item.createdAt,
  };
}
