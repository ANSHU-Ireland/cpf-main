import 'server-only';

import type {
  AccommodationRequestView,
  CampaignOpsView,
  CampaignView,
  CandidateRecordView,
  Collection,
  ComparisonRowView,
  DepartmentView,
  EmployerOrgProfileView,
  ImportResultView,
  IntegrationView,
  MemberView,
  PreflightCheckView,
  ReadinessItemView,
  StructureView,
  TeamView,
  TemplateView,
} from './types';

export interface PlatformCampaign {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly roleName: string;
  readonly status: 'draft' | 'active' | 'paused' | 'closed' | 'archived';
  readonly createdAt: string;
}

export interface PlatformCampaignPage {
  readonly items: readonly PlatformCampaign[];
  readonly total: number;
}

export interface PlatformCampaignStats {
  readonly campaignId: string;
  readonly totalApplications: number;
  readonly byStatus: Readonly<Record<string, number>>;
}

export interface PlatformCampaignDashboard {
  readonly campaignId: string;
  readonly totalApplications: number;
  readonly totalReviewers: number;
  readonly unassignedReviews: number;
  readonly averageScore: number | null;
  readonly statusBreakdown: Readonly<Record<string, number>>;
}

export interface PlatformCampaignComparison {
  readonly campaignId: string;
  readonly candidates: readonly {
    readonly applicationId: string;
    readonly candidateReference: string;
    readonly reviewStatus: string;
    readonly criteriaScored: number;
    readonly criteriaTotal: number;
  }[];
}

export interface PlatformPreflight {
  readonly campaignId: string;
  readonly ready: boolean;
  readonly checks: readonly PreflightCheckView[];
}

export function campaignView(
  campaign: PlatformCampaign,
  stats?: PlatformCampaignStats,
  preflight?: PlatformPreflight,
): CampaignView {
  return {
    id: campaign.id,
    name: campaign.title,
    roleTitle: campaign.roleName,
    status: campaign.status,
    candidateCount: stats?.totalApplications ?? 0,
    openBlockers: preflight?.checks.filter((item) => !item.resolved).length ?? 0,
    createdAt: campaign.createdAt,
  };
}

export function campaignOps(data: PlatformCampaignDashboard): CampaignOpsView {
  const count = (status: string): number => data.statusBreakdown[status] ?? 0;
  return {
    campaignId: data.campaignId,
    invited: count('invited'),
    inProgress: count('started') + count('created'),
    submitted: count('submitted'),
    underReview: count('in_review'),
    decided: count('reviewed') + count('progressed') + count('not_progressed'),
    exceptions: [],
  };
}

export function campaignComparison(
  data: PlatformCampaignComparison,
): Collection<ComparisonRowView> {
  const items = data.candidates.map((candidate) => ({
    applicationId: candidate.applicationId,
    candidateRef: candidate.candidateReference,
    reviewStatus: candidate.reviewStatus,
    criteriaScored: candidate.criteriaScored,
    criteriaTotal: candidate.criteriaTotal,
  }));
  return { items, total: items.length };
}

export function preflightChecks(data: PlatformPreflight): Collection<PreflightCheckView> {
  return { items: data.checks, total: data.checks.length };
}

export interface PlatformOrganization {
  readonly legalName: string;
  readonly displayName: string;
  readonly defaultTimezone: string;
  readonly settings: Readonly<Record<string, unknown>>;
}

export function organizationProfile(data: PlatformOrganization): EmployerOrgProfileView {
  return {
    displayName: data.displayName,
    legalName: data.legalName,
    defaultTimezone: data.defaultTimezone,
    supportEmail: typeof data.settings.supportEmail === 'string' ? data.settings.supportEmail : '',
  };
}

export interface PlatformMember {
  readonly id: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly roles: readonly string[];
  readonly status: 'invited' | 'active' | 'suspended' | 'revoked';
}

export function members(data: {
  readonly items: readonly PlatformMember[];
  readonly total: number;
}): Collection<MemberView> {
  const items = data.items
    .filter((member) => member.status !== 'revoked')
    .map((member) => ({
      id: member.id,
      name: member.displayName ?? member.email ?? 'Member',
      email: member.email ?? '',
      roles: member.roles,
      status:
        member.status === 'suspended'
          ? ('suspended' as const)
          : member.status === 'invited'
            ? ('invited' as const)
            : ('active' as const),
    }));
  return { items, total: items.length };
}

interface PlatformDepartment {
  readonly id: string;
  readonly name: string;
}

interface PlatformTeam {
  readonly id: string;
  readonly name: string;
  readonly departmentId: string;
}

export function structure(
  departmentData: { readonly items: readonly PlatformDepartment[] },
  teamData: { readonly items: readonly PlatformTeam[] },
): StructureView {
  const names = new Map(departmentData.items.map((item) => [item.id, item.name]));
  const teams: TeamView[] = teamData.items.map((team) => ({
    id: team.id,
    name: team.name,
    departmentId: team.departmentId,
    departmentName: names.get(team.departmentId) ?? 'Unassigned department',
  }));
  const departments: DepartmentView[] = departmentData.items.map((department) => ({
    id: department.id,
    name: department.name,
    teamCount: teams.filter((team) => team.departmentId === department.id).length,
  }));
  return { departments, teams };
}

export interface PlatformAccommodation {
  readonly id: string;
  readonly applicationId: string;
  readonly requestSummary: string;
  readonly operationalAdjustments: Readonly<Record<string, unknown>>;
  readonly status: string;
  readonly reviewedBy: string | null;
}

export function accommodation(item: PlatformAccommodation): AccommodationRequestView {
  const category = item.operationalAdjustments.category;
  const summary = item.operationalAdjustments.summary;
  return {
    id: item.id,
    candidateRef: `application-${item.applicationId.slice(0, 8)}`,
    category: typeof category === 'string' ? category : 'Operational adjustment',
    adjustmentSummary: typeof summary === 'string' ? summary : item.requestSummary,
    status:
      item.status === 'approved' || item.status === 'declined'
        ? item.status
        : item.status === 'under_review'
          ? 'more_info'
          : 'pending',
    decidedBy: item.reviewedBy,
  };
}

export function accommodations(data: {
  readonly items: readonly PlatformAccommodation[];
  readonly total: number;
}): Collection<AccommodationRequestView> {
  return { items: data.items.map(accommodation), total: data.total };
}

export interface PlatformIntegration {
  readonly id: string;
  readonly connectionType: string;
  readonly provider: string;
  readonly status: string;
  readonly createdAt: string;
}

export function integration(item: PlatformIntegration): IntegrationView {
  return {
    id: item.id,
    name: item.provider,
    kind: item.connectionType,
    status:
      item.status === 'active' ? 'connected' : item.status === 'degraded' ? 'error' : 'disabled',
    endpoint: '',
  };
}

export function integrations(data: {
  readonly items: readonly PlatformIntegration[];
  readonly total: number;
}): Collection<IntegrationView> {
  return { items: data.items.map(integration), total: data.total };
}

export interface PlatformTemplate {
  readonly id: string;
  readonly templateCode: string;
  readonly channel: string;
  readonly subject: string;
  readonly createdAt: string;
}

export function template(item: PlatformTemplate): TemplateView {
  return {
    id: item.id,
    name: item.templateCode,
    channel: item.channel === 'sms' ? 'sms' : 'email',
    subject: item.subject,
    updatedAt: item.createdAt,
  };
}

export function templates(data: {
  readonly items: readonly PlatformTemplate[];
  readonly total: number;
}): Collection<TemplateView> {
  return { items: data.items.map(template), total: data.total };
}

export interface PlatformReadiness {
  readonly humanOversightConfirmed: boolean;
  readonly monitoringConfirmed: boolean;
  readonly recordKeepingConfirmed: boolean;
}

const READINESS: readonly {
  readonly id: keyof PlatformReadiness;
  readonly label: string;
  readonly detail: string;
}[] = [
  {
    id: 'humanOversightConfirmed',
    label: 'Human oversight',
    detail: 'Human review authority, competence and escalation ownership are confirmed.',
  },
  {
    id: 'monitoringConfirmed',
    label: 'Operational monitoring',
    detail: 'Monitoring, incident response and post-market feedback are confirmed.',
  },
  {
    id: 'recordKeepingConfirmed',
    label: 'Record keeping',
    detail: 'Audit, evidence retention and records-of-processing controls are confirmed.',
  },
];

export function readiness(data: PlatformReadiness): Collection<ReadinessItemView> {
  const items = READINESS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    severity: data[definition.id] ? ('ready' as const) : ('blocker' as const),
    detail: definition.detail,
    resolved: data[definition.id],
  }));
  return { items, total: items.length };
}

export function readinessUpdate(
  current: PlatformReadiness,
  itemId: string,
): PlatformReadiness | null {
  if (!READINESS.some((item) => item.id === itemId)) return null;
  return { ...current, [itemId]: true };
}

export interface PlatformCandidate {
  readonly id: string;
  readonly externalReference: string | null;
  readonly status: 'active' | 'withdrawn' | 'restricted' | 'deleted';
}

export function candidateRecord(item: PlatformCandidate): CandidateRecordView {
  const reference = item.externalReference ?? `candidate-${item.id.slice(0, 8)}`;
  return {
    id: item.id,
    reference,
    displayName: reference,
    status:
      item.status === 'withdrawn' ? 'withdrawn' : item.status === 'deleted' ? 'merged' : 'active',
    email: '',
    applications: [],
    accommodationsNote: '',
  };
}

export interface PlatformImportJob {
  readonly id: string;
  readonly campaignId: string;
  readonly status: string;
  readonly fileName: string;
  readonly totalRows: number;
  readonly validRows: number;
  readonly errorRows: number;
}

export interface PlatformImportRow {
  readonly id: string;
  readonly rowNumber: number;
  readonly displayValue: string;
  readonly validationErrors: readonly string[];
  readonly action: 'include' | 'exclude' | 'merge' | 'keep_separate';
  readonly duplicateCandidateId: string | null;
  readonly status: 'valid' | 'invalid' | 'excluded' | 'committed' | 'failed';
}

export function importResult(
  job: PlatformImportJob,
  rows: readonly PlatformImportRow[],
): ImportResultView {
  return {
    importId: job.id,
    stage: job.status === 'completed' || job.status === 'partial' ? 'committed' : 'validated',
    status: job.status,
    fileName: job.fileName,
    totalRows: job.totalRows,
    validRows: job.validRows,
    errors: rows.flatMap((row) =>
      row.validationErrors.map((message) => ({ row: row.rowNumber, message })),
    ),
    rows: rows.map((row) => ({
      id: row.id,
      row: row.rowNumber,
      displayValue: row.displayValue,
      status: row.status,
      action: row.action,
      errors: row.validationErrors,
      duplicateCandidateId: row.duplicateCandidateId,
    })),
  };
}
