import 'server-only';

import { randomUUID } from 'node:crypto';
import { createPool } from '@cpf/db';
import {
  PgDecisionRepository,
  type Actor,
  type DecisionContext,
  type DecisionType,
} from '@cpf/org';

import type {
  AttemptStatus,
  AttemptTaskView,
  AttemptView,
  CampaignView,
  Collection,
  CriterionState,
  CriterionView,
  DecisionApprovalView,
  DecisionDraftView,
  DecisionOutcome,
  ImportResultView,
  TaskKind,
} from './types';

const API_BASE_URL = process.env.CPF_API_BASE_URL ?? 'http://127.0.0.1:3300';
const PERSISTENCE_ENABLED = process.env.CPF_DEMO_PERSISTENCE === 'true';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CANDIDATE_TOKEN = process.env.CPF_DEMO_CANDIDATE_TOKEN ?? 'cpf-demo-candidate-token-2026';
const REVIEWER_TOKEN = process.env.CPF_DEMO_REVIEWER_TOKEN ?? 'cpf-demo-reviewer-token-2026';
const ADMIN_TOKEN = process.env.CPF_DEMO_ADMIN_TOKEN ?? 'cpf-demo-admin-token-2026';
const APPROVER_TOKEN = process.env.CPF_DEMO_APPROVER_TOKEN ?? 'cpf-demo-approver-token-2026';

const DEMO_ATTEMPT_ID = '11111111-0000-4000-8000-000000000300';
const DEMO_ASSIGNMENT_ID = '11111111-0000-4000-8000-000000000321';
const DEMO_CAMPAIGN_ID = '11111111-0000-4000-8000-000000000200';
const DEMO_DECISION_APPLICATION_ID = '11111111-0000-4000-8000-000000000217';
const DEMO_ADMIN_USER_ID = '11111111-0000-4000-8000-000000000010';

const CAMPAIGN_IDS: Readonly<Record<string, string>> = {
  cmp_frontend_demo: DEMO_CAMPAIGN_ID,
};

const APPLICATION_IDS: Readonly<Record<string, string>> = {
  app_frontend_demo: DEMO_DECISION_APPLICATION_ID,
};

const DEMO_ADMIN_ACTOR: Actor = {
  tenantId: '11111111-0000-4000-8000-000000000001',
  userId: DEMO_ADMIN_USER_ID,
  roles: ['employer_admin'],
};

let decisionReadRepository: PgDecisionRepository | null = null;

function getDecisionReadRepository(): PgDecisionRepository {
  decisionReadRepository ??= new PgDecisionRepository(createPool(), { role: 'cpf_app' });
  return decisionReadRepository;
}

const TASK_IDS: Readonly<Record<string, string>> = {
  task_doc: '11111111-0000-4000-8000-000000000133',
  task_applied: '11111111-0000-4000-8000-000000000134',
  task_code: '11111111-0000-4000-8000-000000000135',
  task_sheet: '11111111-0000-4000-8000-000000000136',
  task_playbook: '11111111-0000-4000-8000-000000000137',
};

const CRITERION_IDS: Readonly<Record<string, string>> = {
  cri_correctness: '11111111-0000-4000-8000-000000000111',
  cri_design: '11111111-0000-4000-8000-000000000112',
  cri_communication: '11111111-0000-4000-8000-000000000113',
  cri_risk: '11111111-0000-4000-8000-000000000114',
  cri_delivery: '11111111-0000-4000-8000-000000000115',
};

interface BackendAttemptTask {
  readonly id: string;
  readonly sectionId: string;
  readonly itemType: string;
  readonly title: string;
  readonly prompt: unknown;
  readonly response: unknown;
  readonly savedAt: string | null;
  readonly flagged: boolean;
  readonly version: number;
  readonly checksum: string;
}

interface BackendAttempt {
  readonly status: string;
  readonly assessmentTitle: string;
  readonly serverNow: string;
  readonly deadlineAt: string;
  readonly submittedAt: string | null;
  readonly receiptRef: string | null;
  readonly activeItemId: string | null;
  readonly sections: readonly {
    readonly id: string;
    readonly title: string;
  }[];
  readonly tasks: readonly BackendAttemptTask[];
}

interface BackendCriterion {
  readonly criterionId: string;
  readonly title: string;
  readonly description: string;
  readonly humanScore: number | null;
  readonly insufficientEvidence: boolean;
  readonly evidenceLinks: readonly unknown[];
  readonly reviewerComment: string | null;
  readonly updatedAt: string | null;
}

interface BackendScorecard {
  readonly status: string;
  readonly criteria?: readonly BackendCriterion[];
}

interface BackendCampaign {
  readonly id: string;
  readonly title: string;
  readonly roleName: string;
  readonly status: 'draft' | 'active' | 'paused' | 'closed' | 'archived';
  readonly createdAt: string;
}

interface BackendCampaignPage {
  readonly items: readonly BackendCampaign[];
  readonly total: number;
}

interface BackendImportJob {
  readonly id: string;
  readonly campaignId: string;
  readonly status: string;
  readonly fileName: string;
  readonly totalRows: number;
  readonly validRows: number;
  readonly errorRows: number;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

interface BackendImportRow {
  readonly id: string;
  readonly rowNumber: number;
  readonly displayValue: string;
  readonly validationErrors: readonly string[];
  readonly action: 'include' | 'exclude' | 'merge' | 'keep_separate';
  readonly duplicateCandidateId: string | null;
  readonly status: 'valid' | 'invalid' | 'excluded' | 'committed' | 'failed';
}

interface BackendImportRows {
  readonly items: readonly BackendImportRow[];
  readonly total: number;
}

export class DemoPersistenceError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'DemoPersistenceError';
    this.status = status;
  }
}

async function requestJson<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  token: string,
  body?: unknown,
  extraHeaders: Readonly<Record<string, string>> = {},
): Promise<T | null> {
  if (!PERSISTENCE_ENABLED) return null;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...extraHeaders,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new DemoPersistenceError(503, 'The PostgreSQL demo service is unavailable.');
  }
  if (!response.ok) {
    let detail = `Persistence request failed (${String(response.status)}).`;
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      detail = problem.detail ?? problem.title ?? detail;
    } catch {
      // Preserve the transport fallback for non-JSON errors.
    }
    throw new DemoPersistenceError(response.status, detail);
  }
  if (response.status === 204) return null;
  return (await response.json()) as T;
}

async function persist(
  path: string,
  method: 'POST' | 'PUT',
  token: string,
  body?: unknown,
): Promise<void> {
  await requestJson(path, method, token, body);
}

function mappedId(map: Readonly<Record<string, string>>, id: string, label: string): string {
  if (Object.values(map).includes(id) || UUID_RE.test(id)) return id;
  const mapped = map[id];
  if (mapped === undefined)
    throw new DemoPersistenceError(404, `${label} is not in the demo fixture.`);
  return mapped;
}

function externalId(map: Readonly<Record<string, string>>, id: string): string {
  return Object.entries(map).find(([, value]) => value === id)?.[0] ?? id;
}

function attemptStatus(status: string): AttemptStatus {
  switch (status) {
    case 'in_progress':
      return 'in_progress';
    case 'on_break':
    case 'paused':
      return 'paused';
    case 'submitting':
      return 'submitting';
    case 'submitted':
      return 'submitted';
    case 'expired':
      return 'expired';
    case 'abandoned':
    case 'voided':
      return 'voided';
    default:
      return 'ready';
  }
}

function taskKind(itemType: string): TaskKind {
  if (itemType === 'code' || itemType === 'coding') return 'code';
  if (itemType === 'sheet' || itemType === 'spreadsheet') return 'sheet';
  return 'document';
}

function promptText(prompt: unknown): string {
  if (typeof prompt === 'string') return prompt;
  if (prompt !== null && typeof prompt === 'object') {
    const brief = (prompt as Record<string, unknown>)['brief'];
    if (typeof brief === 'string') return brief;
  }
  return JSON.stringify(prompt ?? '');
}

function responseText(response: unknown): string {
  if (typeof response === 'string') return response;
  if (response === null || response === undefined) return '';
  return JSON.stringify(response);
}

export function projectDemoAttempt(attempt: BackendAttempt, routeId: string): AttemptView {
  const activeItemId =
    attempt.activeItemId === null ? null : externalId(TASK_IDS, attempt.activeItemId);
  const tasks: readonly AttemptTaskView[] = attempt.tasks.map((task) => {
    const id = externalId(TASK_IDS, task.id);
    return {
      id,
      sectionId: task.sectionId,
      kind: taskKind(task.itemType),
      title: task.title,
      prompt: promptText(task.prompt),
      status: task.flagged
        ? 'flagged'
        : id === activeItemId
          ? 'in_progress'
          : task.savedAt === null
            ? 'not_started'
            : 'saved',
      response: responseText(task.response),
      savedAt: task.savedAt,
      flagged: task.flagged,
      version: task.version,
      checksum: task.checksum,
    };
  });
  return {
    id: routeId,
    assessmentTitle: attempt.assessmentTitle,
    status: attemptStatus(attempt.status),
    deadlineAt: attempt.deadlineAt,
    serverNow: attempt.serverNow,
    autosave: tasks.some((task) => task.savedAt !== null) ? 'saved' : 'idle',
    sections: attempt.sections.map((section) => ({
      id: section.id,
      title: section.title,
      taskIds: tasks.filter((task) => task.sectionId === section.id).map((task) => task.id),
    })),
    tasks,
    submittedAt: attempt.submittedAt,
    receiptRef: attempt.receiptRef,
  };
}

function evidenceLabel(evidenceLinks: readonly unknown[]): string {
  const first = evidenceLinks[0];
  if (typeof first === 'string') return first;
  if (first !== null && typeof first === 'object') {
    const label = (first as Record<string, unknown>)['label'];
    if (typeof label === 'string') return label;
  }
  return '';
}

function criterionState(scorecardStatus: string, criterion: BackendCriterion): CriterionState {
  if (scorecardStatus === 'submitted' || scorecardStatus === 'locked') return 'submitted';
  if (
    criterion.updatedAt !== null ||
    criterion.humanScore !== null ||
    criterion.insufficientEvidence ||
    criterion.reviewerComment !== null
  )
    return 'saved';
  return 'draft';
}

export function projectDemoScorecard(scorecard: BackendScorecard): Collection<CriterionView> {
  const items = (scorecard.criteria ?? []).map((criterion) => ({
    id: externalId(CRITERION_IDS, criterion.criterionId),
    label: criterion.title,
    descriptor: criterion.description,
    maxScore: 4,
    score: criterion.humanScore,
    rationale: criterion.reviewerComment ?? '',
    state: criterionState(scorecard.status, criterion),
    evidenceLink: evidenceLabel(criterion.evidenceLinks),
    insufficientEvidence: criterion.insufficientEvidence,
  }));
  return { items, total: items.length };
}

function projectDemoCampaign(campaign: BackendCampaign): CampaignView {
  const id = externalId(CAMPAIGN_IDS, campaign.id);
  return {
    id,
    name: campaign.title,
    roleTitle: campaign.roleName,
    status: campaign.status,
    candidateCount: campaign.id === DEMO_CAMPAIGN_ID ? 2 : 0,
    openBlockers: 0,
    createdAt: campaign.createdAt,
  };
}

function campaignCode(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 70);
  return `${slug === '' ? 'CAMPAIGN' : slug}-${Date.now().toString(36).toUpperCase()}`;
}

function projectImportResult(job: BackendImportJob, page: BackendImportRows): ImportResultView {
  const rows = page.items.map((row) => ({
    id: row.id,
    row: row.rowNumber,
    displayValue: row.displayValue,
    status: row.status,
    action: row.action,
    errors: row.validationErrors,
    duplicateCandidateId: row.duplicateCandidateId,
  }));
  return {
    importId: job.id,
    stage: job.status === 'completed' || job.status === 'partial' ? 'committed' : 'validated',
    status: job.status,
    fileName: job.fileName,
    totalRows: job.totalRows,
    validRows: job.validRows,
    errors: rows.flatMap((row) => row.errors.map((message) => ({ row: row.row, message }))),
    rows,
  };
}

async function readImportResult(importId: string): Promise<ImportResultView | null> {
  const [job, rows] = await Promise.all([
    requestJson<BackendImportJob>(
      `/candidate-imports/${encodeURIComponent(importId)}`,
      'GET',
      ADMIN_TOKEN,
    ),
    requestJson<BackendImportRows>(
      `/candidate-imports/${encodeURIComponent(importId)}/rows?limit=100`,
      'GET',
      ADMIN_TOKEN,
    ),
  ]);
  return job === null || rows === null ? null : projectImportResult(job, rows);
}

function decisionDraftStatus(context: DecisionContext): DecisionDraftView['status'] {
  if (context.decision === null) return 'draft';
  if (context.decision.status === 'issued') return 'issued';
  if (context.approval?.status === 'rejected') return 'returned';
  if (context.approval?.status === 'pending' || context.decision.status === 'pending_approval') {
    return 'awaiting_approval';
  }
  return 'draft';
}

function projectDecisionDraft(context: DecisionContext): DecisionDraftView {
  return {
    applicationId: externalId(APPLICATION_IDS, context.applicationId),
    decisionId: context.decision?.id ?? null,
    candidateRef: context.candidateRef,
    campaignName: context.campaignName,
    outcome: (context.decision?.decision as DecisionOutcome | undefined) ?? null,
    rationale: context.decision?.rationale ?? '',
    evidenceLinks: context.decision?.evidenceLinks ?? [],
    reviewComplete: context.reviewComplete,
    status: decisionDraftStatus(context),
  };
}

function projectDecisionApproval(context: DecisionContext): DecisionApprovalView {
  const decision = context.decision;
  const status: DecisionApprovalView['status'] =
    decision === null
      ? 'awaiting_review'
      : decision.status === 'issued'
        ? 'issued'
        : context.approval?.status === 'rejected'
          ? 'returned'
          : context.approval?.status === 'approved'
            ? 'approved'
            : 'awaiting_approval';
  return {
    applicationId: externalId(APPLICATION_IDS, context.applicationId),
    decisionId: decision?.id ?? null,
    candidateRef: context.candidateRef,
    campaignName: context.campaignName,
    outcome: (decision?.decision as DecisionOutcome | undefined) ?? null,
    rationale: decision?.rationale ?? '',
    evidenceLinks: decision?.evidenceLinks ?? [],
    draftedBy: decision?.decidedByName ?? 'Not yet drafted',
    status,
    approver: decision?.secondApprovedByName ?? null,
    approvedAt: decision?.secondApprovedAt ?? null,
    issuedAt: decision?.issuedAt ?? null,
    returnRationale: context.approval?.status === 'rejected' ? context.approval.rationale : null,
  };
}

async function readDecisionContext(routeId: string): Promise<DecisionContext | null> {
  if (!PERSISTENCE_ENABLED) return null;
  const applicationId = mappedId(APPLICATION_IDS, routeId, 'Application');
  try {
    return await getDecisionReadRepository().getDecisionContext(DEMO_ADMIN_ACTOR, applicationId);
  } catch (error) {
    throw new DemoPersistenceError(
      503,
      error instanceof Error
        ? `The persisted decision read model is unavailable: ${error.message}`
        : 'The persisted decision read model is unavailable.',
    );
  }
}

export const demoPersistence = {
  enabled: PERSISTENCE_ENABLED,

  getAttempt: async (routeId: string): Promise<AttemptView | null> => {
    const attempt = await requestJson<BackendAttempt>(
      `/attempts/${DEMO_ATTEMPT_ID}`,
      'GET',
      CANDIDATE_TOKEN,
    );
    return attempt === null ? null : projectDemoAttempt(attempt, routeId);
  },

  startAttempt: (): Promise<void> =>
    persist(`/attempts/${DEMO_ATTEMPT_ID}/start`, 'POST', CANDIDATE_TOKEN, {}),

  submitAttempt: (): Promise<void> =>
    persist(`/attempts/${DEMO_ATTEMPT_ID}/submit`, 'POST', CANDIDATE_TOKEN, {}),

  saveTask: (taskId: string, response: string): Promise<void> =>
    persist(
      `/attempts/${DEMO_ATTEMPT_ID}/responses/${mappedId(TASK_IDS, taskId, 'Task')}`,
      'PUT',
      CANDIDATE_TOKEN,
      { value: response },
    ),

  setTaskFlag: (taskId: string, flagged: boolean): Promise<void> =>
    persist(
      `/attempts/${DEMO_ATTEMPT_ID}/item-flags/${mappedId(TASK_IDS, taskId, 'Task')}`,
      'PUT',
      CANDIDATE_TOKEN,
      { flagged },
    ),

  startBreak: (): Promise<void> =>
    persist(`/attempts/${DEMO_ATTEMPT_ID}/breaks`, 'POST', CANDIDATE_TOKEN, {
      reason: 'Candidate requested a scheduled break.',
    }),

  endBreak: (): Promise<void> =>
    persist(`/attempts/${DEMO_ATTEMPT_ID}/start`, 'POST', CANDIDATE_TOKEN, {}),

  getScorecard: async (): Promise<Collection<CriterionView> | null> => {
    const scorecard = await requestJson<BackendScorecard>(
      `/review-assignments/${DEMO_ASSIGNMENT_ID}/scorecard`,
      'GET',
      REVIEWER_TOKEN,
    );
    return scorecard === null ? null : projectDemoScorecard(scorecard);
  },

  saveCriterion: (
    criterionId: string,
    score: number,
    rationale: string,
    evidenceLink: string,
    insufficientEvidence: boolean,
  ): Promise<void> =>
    persist(`/review-assignments/${DEMO_ASSIGNMENT_ID}/scorecard`, 'PUT', REVIEWER_TOKEN, {
      criterion: {
        criterionId: mappedId(CRITERION_IDS, criterionId, 'Criterion'),
        humanScore: insufficientEvidence ? null : score,
        confidence: insufficientEvidence ? null : score >= 4 ? 0.9 : score >= 3 ? 0.8 : 0.65,
        insufficientEvidence,
        evidenceLinks: insufficientEvidence ? [] : [{ label: evidenceLink }],
        reviewerComment: rationale,
      },
    }),

  getCampaigns: async (): Promise<Collection<CampaignView> | null> => {
    const page = await requestJson<BackendCampaignPage>('/campaigns?limit=100', 'GET', ADMIN_TOKEN);
    if (page === null) return null;
    const items = page.items.map(projectDemoCampaign);
    return { items, total: page.total };
  },

  getCampaign: async (campaignId: string): Promise<CampaignView | null> => {
    const campaign = await requestJson<BackendCampaign>(
      `/campaigns/${mappedId(CAMPAIGN_IDS, campaignId, 'Campaign')}`,
      'GET',
      ADMIN_TOKEN,
    );
    return campaign === null ? null : projectDemoCampaign(campaign);
  },

  createCampaign: async (name: string, roleTitle: string): Promise<CampaignView | null> => {
    const campaign = await requestJson<BackendCampaign>('/campaigns', 'POST', ADMIN_TOKEN, {
      code: campaignCode(name),
      title: name,
      roleName: roleTitle,
      seniority: 'mid',
    });
    return campaign === null ? null : projectDemoCampaign(campaign);
  },

  setCampaignStatus: async (
    campaignId: string,
    status: CampaignView['status'],
  ): Promise<CampaignView | null> => {
    if (status === 'draft' || status === 'blocked') {
      throw new DemoPersistenceError(422, 'The campaign cannot return to that status.');
    }
    const campaign = await requestJson<BackendCampaign>(
      `/campaigns/${mappedId(CAMPAIGN_IDS, campaignId, 'Campaign')}/${status === 'active' ? 'activate' : status === 'paused' ? 'pause' : status === 'closed' ? 'close' : 'archive'}`,
      'POST',
      ADMIN_TOKEN,
      {},
    );
    return campaign === null ? null : projectDemoCampaign(campaign);
  },

  getDecision: async (applicationId: string): Promise<DecisionDraftView | null> => {
    const context = await readDecisionContext(applicationId);
    return context === null ? null : projectDecisionDraft(context);
  },

  saveDecision: async (
    applicationId: string,
    outcome: DecisionOutcome,
    rationale: string,
    evidenceLinks: readonly string[],
  ): Promise<DecisionDraftView | null> => {
    const persistedApplicationId = mappedId(APPLICATION_IDS, applicationId, 'Application');
    await requestJson(
      `/applications/${persistedApplicationId}/decisions`,
      'POST',
      ADMIN_TOKEN,
      {
        data: {
          decision: outcome as DecisionType,
          rationale,
          evidenceLinks,
          secondApprovalRequired: true,
        },
      },
      { 'idempotency-key': `decision-draft-${randomUUID()}` },
    );
    const context = await readDecisionContext(applicationId);
    return context === null ? null : projectDecisionDraft(context);
  },

  getApproval: async (applicationId: string): Promise<DecisionApprovalView | null> => {
    const context = await readDecisionContext(applicationId);
    return context === null ? null : projectDecisionApproval(context);
  },

  approveDecision: async (applicationId: string): Promise<DecisionApprovalView | null> => {
    const context = await readDecisionContext(applicationId);
    const decisionId = context?.decision?.id;
    if (decisionId === undefined) {
      throw new DemoPersistenceError(409, 'No human decision is awaiting approval.');
    }
    await requestJson(
      `/decisions/${decisionId}/approvals`,
      'POST',
      APPROVER_TOKEN,
      { data: { status: 'approved', rationale: 'Independent human approval completed.' } },
      { 'idempotency-key': `decision-approval-${randomUUID()}` },
    );
    await requestJson(
      `/decisions/${decisionId}/issue`,
      'POST',
      APPROVER_TOKEN,
      { data: {} },
      { 'idempotency-key': `decision-issue-${randomUUID()}` },
    );
    const next = await readDecisionContext(applicationId);
    return next === null ? null : projectDecisionApproval(next);
  },

  returnDecision: async (
    applicationId: string,
    rationale: string,
  ): Promise<DecisionApprovalView | null> => {
    const context = await readDecisionContext(applicationId);
    const decisionId = context?.decision?.id;
    if (decisionId === undefined) {
      throw new DemoPersistenceError(409, 'No human decision is awaiting approval.');
    }
    await requestJson(
      `/decisions/${decisionId}/approvals`,
      'POST',
      APPROVER_TOKEN,
      { data: { status: 'rejected', rationale } },
      { 'idempotency-key': `decision-return-${randomUUID()}` },
    );
    const next = await readDecisionContext(applicationId);
    return next === null ? null : projectDecisionApproval(next);
  },

  validateCandidateImport: async (
    campaignId: string,
    fileName: string,
    rowText: string,
  ): Promise<ImportResultView | null> => {
    const rows = rowText
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter((row) => row.length > 0);
    const job = await requestJson<BackendImportJob>(
      `/campaigns/${mappedId(CAMPAIGN_IDS, campaignId, 'Campaign')}/candidate-imports`,
      'POST',
      ADMIN_TOKEN,
      { data: { fileName, rows } },
      { 'idempotency-key': `candidate-import-${randomUUID()}` },
    );
    return job === null ? null : readImportResult(job.id);
  },

  updateCandidateImportRow: async (
    importId: string,
    rowId: string,
    action: BackendImportRow['action'],
    value?: string,
  ): Promise<ImportResultView | null> => {
    await requestJson(
      `/candidate-imports/${encodeURIComponent(importId)}/rows/${encodeURIComponent(rowId)}`,
      'PATCH',
      ADMIN_TOKEN,
      { data: { action, ...(value === undefined ? {} : { value }) } },
      { 'idempotency-key': `candidate-import-row-${randomUUID()}` },
    );
    return readImportResult(importId);
  },

  commitCandidateImport: async (importId: string): Promise<ImportResultView | null> => {
    await requestJson(
      `/candidate-imports/${encodeURIComponent(importId)}/commit`,
      'POST',
      ADMIN_TOKEN,
      { data: {} },
      { 'idempotency-key': `candidate-import-commit-${randomUUID()}` },
    );
    return readImportResult(importId);
  },

  cancelCandidateImport: async (importId: string): Promise<void> => {
    await requestJson(
      `/candidate-imports/${encodeURIComponent(importId)}/cancel`,
      'POST',
      ADMIN_TOKEN,
      { data: {} },
      { 'idempotency-key': `candidate-import-cancel-${randomUUID()}` },
    );
  },
};
