import type {
  AccommodationView,
  CandidateApplicationView,
  Collection,
  ComplaintView,
  DataRightsRequestView,
  DataRightsType,
  NoticeView,
  PreferencesView,
  ProfileView,
  ScheduleSlotView,
  SecurityEventView,
  SessionView,
} from './types';
import type {
  AiMessageView,
  ArtifactView,
  AttemptControlsView,
  AttemptTaskView,
  AttemptView,
  PluginRunView,
} from './types';
import type {
  AssignmentView,
  ClarificationView,
  CriterionView,
  EvidenceItemView,
  IntegrityFlagView,
  ObservationItemView,
  ObservationsView,
  ReviewResponseKind,
  ReviewSubmissionView,
  ReviewerAvailabilityView,
  ReviewerProfileView,
  TrainingModuleView,
} from './types';
import type {
  AccommodationRequestView,
  AssignmentBoardItemView,
  CampaignExceptionView,
  CampaignOpsView,
  CampaignStatus,
  CampaignView,
  CandidateRecordView,
  ComparisonRowView,
  DecisionApprovalView,
  DecisionDraftView,
  DecisionOutcome,
  DepartmentView,
  EmployerCandidateView,
  EmployerDashboardView,
  EmployerOrgProfileView,
  ImportResultView,
  IntegrationView,
  InvitationView,
  MemberView,
  PreflightCheckView,
  ReadinessItemView,
  ReportView,
  ReviewerAdminView,
  ScheduleWindowView,
  StructureView,
  TeamView,
  TemplateView,
} from './types';

/**
 * Process-local synthetic data source for the demo web app. This is intentionally in-memory and
 * fabricated — no real personal data — matching the "Synthetic demo environment" invariant. It is
 * the single seam that a real `@cpf/*` API adapter will replace.
 */

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const profile: ProfileView = {
  userId: 'usr_demo_reviewer',
  email: 'rivka.demo@example.test',
  displayName: 'Rivka Demo',
  userType: 'reviewer',
  status: 'active',
  tenant: {
    tenantId: 'org_northwind',
    tenantName: 'Northwind Assessments (Demo)',
    membershipStatus: 'active',
    roles: ['reviewer', 'reviewer_lead'],
  },
};

let preferences: PreferencesView = {
  theme: 'system',
  density: 'comfortable',
  locale: 'en-GB',
  timezone: 'Europe/London',
  reducedMotion: false,
};

const sessions: SessionView[] = [
  {
    id: 'sess_current',
    device: 'Chrome on Windows',
    location: 'London, GB',
    createdAt: '2026-08-01T09:12:00.000Z',
    lastSeenAt: '2026-08-04T14:30:00.000Z',
    current: true,
  },
  {
    id: 'sess_ipad',
    device: 'Safari on iPad',
    location: 'London, GB',
    createdAt: '2026-07-28T18:40:00.000Z',
    lastSeenAt: '2026-08-02T21:05:00.000Z',
    current: false,
  },
];

const securityEvents: SecurityEventView[] = [
  {
    id: 'evt_signin_new_device',
    type: 'sign_in',
    description: 'Signed in from a new device (Safari on iPad).',
    occurredAt: '2026-07-28T18:40:00.000Z',
    severity: 'info',
  },
  {
    id: 'evt_password_changed',
    type: 'password_changed',
    description: 'Account password was changed.',
    occurredAt: '2026-07-20T11:02:00.000Z',
    severity: 'warning',
  },
  {
    id: 'evt_mfa_enabled',
    type: 'mfa_enabled',
    description: 'Two-factor authentication was enabled.',
    occurredAt: '2026-07-19T08:15:00.000Z',
    severity: 'info',
  },
];

const notices: NoticeView[] = [
  {
    id: 'ntc_policy_update',
    title: 'Updated review integrity policy',
    body: 'Reviewer scorecards now require a written rationale for any AI-flagged observation you override. Effective from the next assessment window.',
    category: 'Policy',
    publishedAt: '2026-08-03T09:00:00.000Z',
    acknowledged: false,
  },
  {
    id: 'ntc_maintenance',
    title: 'Scheduled maintenance',
    body: 'The platform will be read-only on Sunday 02:00–03:00 UTC for scheduled maintenance.',
    category: 'Operations',
    publishedAt: '2026-07-30T16:20:00.000Z',
    acknowledged: true,
  },
];

export const syntheticStore = {
  getProfile(): ProfileView {
    return profile;
  },
  getPreferences(): PreferencesView {
    return preferences;
  },
  updatePreferences(patch: Partial<PreferencesView>): PreferencesView {
    preferences = { ...preferences, ...patch };
    return preferences;
  },
  getSessions(): Collection<SessionView> {
    return { items: sessions, total: sessions.length };
  },
  revokeSession(id: string): boolean {
    const index = sessions.findIndex((s) => s.id === id && !s.current);
    if (index === -1) return false;
    sessions.splice(index, 1);
    return true;
  },
  getSecurityEvents(): Collection<SecurityEventView> {
    return { items: securityEvents, total: securityEvents.length };
  },
  getNotices(): Collection<NoticeView> {
    return { items: notices, total: notices.length };
  },
  acknowledgeNotice(id: string): NoticeView | null {
    const index = notices.findIndex((n) => n.id === id);
    if (index === -1) return null;
    const current = notices[index];
    if (current === undefined) return null;
    const updated: NoticeView = { ...current, acknowledged: true };
    notices[index] = updated;
    return updated;
  },
};

/* ── Candidate journey synthetic data ─────────────────────────────────────────────────────── */

const applications: CandidateApplicationView[] = [
  {
    id: 'app_frontend_northwind',
    employerName: 'Northwind Assessments (Demo)',
    role: 'Frontend Engineer',
    assessmentTitle: 'Frontend Practical (Demo, not validated)',
    status: 'invited',
    invitedAt: '2026-08-02T10:00:00.000Z',
    dueAt: '2026-08-12T17:00:00.000Z',
    decision: null,
  },
  {
    id: 'app_data_globex',
    employerName: 'Globex Talent (Demo)',
    role: 'Data Analyst',
    assessmentTitle: 'Spreadsheet & Data Reasoning (Demo, not validated)',
    status: 'under_review',
    invitedAt: '2026-07-18T09:00:00.000Z',
    dueAt: null,
    decision: null,
  },
  {
    id: 'app_support_initech',
    employerName: 'Initech Hiring (Demo)',
    role: 'Support Specialist',
    assessmentTitle: 'Written Scenarios (Demo, not validated)',
    status: 'decision_available',
    invitedAt: '2026-06-30T09:00:00.000Z',
    dueAt: null,
    decision: {
      outcome: 'Progressed to interview',
      rationale:
        'The reviewing panel judged the written scenarios to meet the role’s communication bar. This decision was recorded by a named employer reviewer.',
      decidedBy: 'A. Employer (Decision Owner)',
      issuedAt: '2026-07-15T14:30:00.000Z',
    },
  },
];

const accommodations: AccommodationView[] = [
  {
    id: 'acc_extra_time',
    category: 'Extra time',
    summary: 'Requested 25% additional time for timed tasks.',
    status: 'approved',
    submittedAt: '2026-07-19T11:00:00.000Z',
    adjustment: '25% additional time applied to timed tasks.',
  },
];

const scheduleSlots: ScheduleSlotView[] = [
  {
    id: 'slot_a',
    assessmentTitle: 'Frontend Practical (Demo, not validated)',
    startsAt: '2026-08-10T09:00:00.000Z',
    endsAt: '2026-08-10T11:00:00.000Z',
    timezone: 'Europe/London',
    mode: 'supervised_desktop',
    selected: false,
  },
  {
    id: 'slot_b',
    assessmentTitle: 'Frontend Practical (Demo, not validated)',
    startsAt: '2026-08-11T13:00:00.000Z',
    endsAt: '2026-08-11T15:00:00.000Z',
    timezone: 'Europe/London',
    mode: 'supervised_desktop',
    selected: false,
  },
];

const dataRights: DataRightsRequestView[] = [];

const complaints: ComplaintView[] = [];

export const candidateStore = {
  getApplications(): Collection<CandidateApplicationView> {
    return { items: applications, total: applications.length };
  },
  applicationAction(
    id: string,
    action: 'withdraw' | 'explanation' | 'human_review',
  ): CandidateApplicationView | null {
    const index = applications.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const current = applications[index];
    if (current === undefined) return null;
    // Withdrawal is the only state transition; explanation/human-review are logged requests that
    // do not mutate the application (a real adapter would create superseding records + audit).
    const updated: CandidateApplicationView =
      action === 'withdraw' ? { ...current, status: 'withdrawn' } : current;
    applications[index] = updated;
    return updated;
  },
  getAccommodations(): Collection<AccommodationView> {
    return { items: accommodations, total: accommodations.length };
  },
  createAccommodation(category: string, summary: string): AccommodationView {
    const created: AccommodationView = {
      id: randomId('acc'),
      category,
      summary,
      status: 'requested',
      submittedAt: new Date().toISOString(),
      adjustment: null,
    };
    accommodations.unshift(created);
    return created;
  },
  getSchedule(): Collection<ScheduleSlotView> {
    return { items: scheduleSlots, total: scheduleSlots.length };
  },
  selectSlot(slotId: string): Collection<ScheduleSlotView> {
    for (let i = 0; i < scheduleSlots.length; i += 1) {
      const slot = scheduleSlots[i];
      if (slot !== undefined) scheduleSlots[i] = { ...slot, selected: slot.id === slotId };
    }
    return { items: scheduleSlots, total: scheduleSlots.length };
  },
  getDataRights(): Collection<DataRightsRequestView> {
    return { items: dataRights, total: dataRights.length };
  },
  createDataRightsRequest(type: DataRightsType, note: string): DataRightsRequestView {
    const created: DataRightsRequestView = {
      id: randomId('dr'),
      type,
      status: 'received',
      submittedAt: new Date().toISOString(),
      note: note.trim() === '' ? null : note,
    };
    dataRights.unshift(created);
    return created;
  },
  getComplaints(): Collection<ComplaintView> {
    return { items: complaints, total: complaints.length };
  },
  createComplaint(subject: string): ComplaintView {
    const created: ComplaintView = {
      id: randomId('cmp'),
      subject,
      status: 'open',
      submittedAt: new Date().toISOString(),
    };
    complaints.unshift(created);
    return created;
  },
};

/* ── Assessment runtime store ─────────────────────────────────────────────────────────────── */

const ATTEMPT_ID = 'att_frontend_demo';

interface RuntimeState {
  status: AttemptView['status'];
  deadlineAt: number; // epoch ms; server-authoritative
  autosave: AttemptView['autosave'];
  submittedAt: string | null;
  receiptRef: string | null;
  tasks: AttemptTaskView[];
  aiMessages: AiMessageView[];
  pluginRuns: PluginRunView[];
  artifacts: ArtifactView[];
  breakStatus: AttemptControlsView['breakStatus'];
  breaksRemaining: number;
}

function freshRuntime(): RuntimeState {
  return {
    status: 'in_progress',
    deadlineAt: Date.now() + 55 * 60 * 1000,
    autosave: 'saved',
    submittedAt: null,
    receiptRef: null,
    tasks: [
      {
        id: 'task_doc',
        sectionId: 'sec_written',
        kind: 'document',
        title: 'Design rationale',
        prompt:
          'Explain how you would structure a reusable component library for a design system. Cover tokens, theming and accessibility.',
        status: 'in_progress',
        response: '',
        savedAt: null,
        flagged: false,
      },
      {
        id: 'task_code',
        sectionId: 'sec_practical',
        kind: 'code',
        title: 'Debounce utility',
        prompt:
          'Implement a typed `debounce(fn, waitMs)` helper and describe how you would test it. Run the sample tests when ready.',
        status: 'not_started',
        response: '',
        savedAt: null,
        flagged: false,
      },
      {
        id: 'task_sheet',
        sectionId: 'sec_practical',
        kind: 'sheet',
        title: 'Data reconciliation',
        prompt:
          'Using the provided workbook, reconcile the two ledgers and summarise the discrepancies. Validate before saving.',
        status: 'not_started',
        response: '',
        savedAt: null,
        flagged: false,
      },
    ],
    aiMessages: [],
    pluginRuns: [],
    artifacts: [],
    breakStatus: 'none',
    breaksRemaining: 1,
  };
}

let runtime = freshRuntime();

const SECTIONS: AttemptView['sections'] = [
  { id: 'sec_written', title: 'Written', taskIds: ['task_doc'] },
  { id: 'sec_practical', title: 'Practical', taskIds: ['task_code', 'task_sheet'] },
];

function projectAttempt(): AttemptView {
  const now = Date.now();
  let status = runtime.status;
  if (status === 'in_progress' && now >= runtime.deadlineAt) {
    status = 'expired';
    runtime.status = 'expired';
  }
  return {
    id: ATTEMPT_ID,
    assessmentTitle: 'Frontend Practical (Demo, not validated)',
    status,
    deadlineAt: new Date(runtime.deadlineAt).toISOString(),
    serverNow: new Date(now).toISOString(),
    autosave: runtime.autosave,
    sections: SECTIONS,
    tasks: runtime.tasks.map((t) => ({ ...t })),
    submittedAt: runtime.submittedAt,
    receiptRef: runtime.receiptRef,
  };
}

export const runtimeStore = {
  attemptId(): string {
    return ATTEMPT_ID;
  },
  getAttempt(): AttemptView {
    return projectAttempt();
  },
  startAttempt(): AttemptView {
    if (runtime.status === 'ready') runtime.status = 'in_progress';
    return projectAttempt();
  },
  saveTask(taskId: string, response: string): AttemptView {
    const index = runtime.tasks.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      const current = runtime.tasks[index];
      if (current !== undefined) {
        runtime.tasks[index] = {
          ...current,
          response,
          status: current.flagged ? 'flagged' : 'saved',
          savedAt: new Date().toISOString(),
        };
      }
      runtime.autosave = 'saved';
    }
    return projectAttempt();
  },
  getAiMessages(): Collection<AiMessageView> {
    return { items: runtime.aiMessages, total: runtime.aiMessages.length };
  },
  sendAiMessage(body: string): Collection<AiMessageView> {
    const at = new Date().toISOString();
    const candidateMsg: AiMessageView = {
      id: randomId('aim'),
      role: 'candidate',
      body,
      at,
      provenanceRef: null,
    };
    const assistantMsg: AiMessageView = {
      id: randomId('aim'),
      role: 'assistant',
      body: 'AI assistant (labelled, logged): here is a general approach you can adapt. This is guidance only — it never contributes to any score or recommendation about you.',
      at: new Date(Date.now() + 500).toISOString(),
      provenanceRef: randomId('prov'),
    };
    runtime.aiMessages.push(candidateMsg, assistantMsg);
    return { items: runtime.aiMessages, total: runtime.aiMessages.length };
  },
  getPluginRuns(): Collection<PluginRunView> {
    return { items: runtime.pluginRuns, total: runtime.pluginRuns.length };
  },
  runPlugin(name: string, input: string): PluginRunView {
    const passed = input.trim().length > 0;
    const run: PluginRunView = {
      id: randomId('run'),
      name,
      input,
      output: passed
        ? 'All 4 sample checks passed. Output captured with provenance for the reviewer.'
        : 'No input provided — provide input to execute the plugin.',
      status: passed ? 'passed' : 'failed',
      ranAt: new Date().toISOString(),
    };
    runtime.pluginRuns.unshift(run);
    return run;
  },
  getArtifacts(): Collection<ArtifactView> {
    return { items: runtime.artifacts, total: runtime.artifacts.length };
  },
  uploadArtifact(name: string, sizeLabel: string): ArtifactView {
    const artifact: ArtifactView = {
      id: randomId('art'),
      name,
      sizeLabel,
      status: 'clean',
      uploadedAt: new Date().toISOString(),
    };
    runtime.artifacts.unshift(artifact);
    return artifact;
  },
  getControls(): AttemptControlsView {
    return {
      flaggedTaskIds: runtime.tasks.filter((t) => t.flagged).map((t) => t.id),
      breakStatus: runtime.breakStatus,
      breaksRemaining: runtime.breaksRemaining,
    };
  },
  toggleFlag(taskId: string): AttemptControlsView {
    const index = runtime.tasks.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      const current = runtime.tasks[index];
      if (current !== undefined) {
        const flagged = !current.flagged;
        runtime.tasks[index] = {
          ...current,
          flagged,
          status: flagged ? 'flagged' : current.savedAt ? 'saved' : 'in_progress',
        };
      }
    }
    return this.getControls();
  },
  requestBreak(): AttemptControlsView {
    if (runtime.breakStatus === 'none' && runtime.breaksRemaining > 0) {
      runtime.breakStatus = 'active';
      runtime.breaksRemaining -= 1;
    }
    return this.getControls();
  },
  endBreak(): AttemptControlsView {
    if (runtime.breakStatus === 'active') runtime.breakStatus = 'none';
    return this.getControls();
  },
  submitAttempt(): AttemptView {
    // Idempotent: a second submit returns the same receipt rather than duplicating.
    if (runtime.status !== 'submitted') {
      runtime.status = 'submitted';
      runtime.submittedAt = new Date().toISOString();
      runtime.receiptRef = randomId('rcpt').toUpperCase();
    }
    return projectAttempt();
  },
  resetAttempt(): AttemptView {
    runtime = freshRuntime();
    return projectAttempt();
  },
};

// ── Reviewer journey store ──────────────────────────────────────────────────────────────────────
// Enforces the evidence-first, human-only-scoring invariant: AI observations stay concealed until
// the reviewer has independently scored every criterion, and no AI score/rank/band is ever stored.

export const REVIEW_ASSIGNMENT_ID = 'asg_frontend_demo';

interface ReviewState {
  profile: ReviewerProfileView;
  availability: ReviewerAvailabilityView;
  training: TrainingModuleView[];
  assignments: AssignmentView[];
  evidence: EvidenceItemView[];
  criteria: CriterionView[];
  observations: ObservationItemView[];
  observationsRevealed: boolean;
  integrity: IntegrityFlagView[];
  clarifications: ClarificationView[];
  submittedAt: string | null;
  receiptRef: string | null;
}

function freshReview(): ReviewState {
  return {
    profile: {
      displayName: 'Rivka Demo',
      disciplines: ['Backend engineering', 'Systems design'],
      biography: 'Senior reviewer with a focus on distributed systems and code quality.',
    },
    availability: {
      state: 'available',
      weeklyCapacity: 6,
      note: 'Prefer morning slots (UTC).',
    },
    training: [
      {
        id: 'trn_bias',
        title: 'Bias awareness and fair review',
        status: 'complete',
        required: true,
        completedAt: '2026-06-01T09:00:00.000Z',
      },
      {
        id: 'trn_rubric',
        title: 'Applying the criterion rubric',
        status: 'in_progress',
        required: true,
        completedAt: null,
      },
      {
        id: 'trn_integrity',
        title: 'Integrity signals and escalation',
        status: 'not_started',
        required: false,
        completedAt: null,
      },
    ],
    assignments: [
      {
        id: REVIEW_ASSIGNMENT_ID,
        assessmentTitle: 'Backend engineer — take-home',
        candidateRef: 'Candidate 7F3A',
        status: 'accepted',
        dueAt: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        criterionCount: 3,
        evidenceCount: 3,
        assignedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      },
      {
        id: 'asg_offered_demo',
        assessmentTitle: 'Data analyst — case study',
        candidateRef: 'Candidate 2B91',
        status: 'offered',
        dueAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        criterionCount: 4,
        evidenceCount: 2,
        assignedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
    ],
    evidence: [
      {
        id: 'ev_doc',
        title: 'Design write-up',
        kind: 'document',
        excerpt: 'The service is partitioned by tenant with row-level security enforced at the…',
        status: 'unreviewed',
      },
      {
        id: 'ev_code',
        title: 'Debounce implementation',
        kind: 'code',
        excerpt: 'export function debounce(fn, wait) { let t; return (...args) => { … } }',
        status: 'unreviewed',
      },
      {
        id: 'ev_sheet',
        title: 'Capacity model',
        kind: 'sheet',
        excerpt: 'Peak RPS = concurrent_users × requests_per_min ÷ 60 …',
        status: 'unreviewed',
      },
    ],
    criteria: [
      {
        id: 'cri_correctness',
        label: 'Correctness',
        descriptor: 'Solution meets the stated requirements and handles edge cases.',
        maxScore: 5,
        score: null,
        rationale: '',
        state: 'draft',
      },
      {
        id: 'cri_design',
        label: 'Design quality',
        descriptor: 'Structure, naming and separation of concerns are sound.',
        maxScore: 5,
        score: null,
        rationale: '',
        state: 'draft',
      },
      {
        id: 'cri_communication',
        label: 'Communication',
        descriptor: 'Reasoning and trade-offs are explained clearly.',
        maxScore: 5,
        score: null,
        rationale: '',
        state: 'draft',
      },
    ],
    observations: [
      {
        id: 'obs_1',
        criterionId: 'cri_correctness',
        body: 'The submission includes tests covering the leading-edge debounce case.',
        provenanceRef: 'AI-OBS-7F3A-01',
      },
      {
        id: 'obs_2',
        criterionId: 'cri_communication',
        body: 'The design write-up references tenant isolation but does not quantify overhead.',
        provenanceRef: 'AI-OBS-7F3A-02',
      },
    ],
    observationsRevealed: false,
    integrity: [
      {
        id: 'int_1',
        summary: 'Idle gap of 22 minutes recorded mid-attempt.',
        status: 'open',
        resolution: '',
      },
    ],
    clarifications: [],
    submittedAt: null,
    receiptRef: null,
  };
}

let review: ReviewState = freshReview();

function allCriteriaScored(): boolean {
  return review.criteria.every((c) => c.score !== null && c.state !== 'draft');
}

export const reviewStore = {
  assignmentId: REVIEW_ASSIGNMENT_ID,
  getAssignments(): Collection<AssignmentView> {
    return { items: review.assignments, total: review.assignments.length };
  },
  getAssignment(id: string): AssignmentView | null {
    return review.assignments.find((a) => a.id === id) ?? null;
  },
  respond(id: string, kind: ReviewResponseKind): AssignmentView | null {
    const index = review.assignments.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const current = review.assignments[index];
    if (current === undefined) return null;
    const status =
      kind === 'accept' ? 'accepted' : kind === 'decline' ? 'declined' : current.status;
    const next: AssignmentView = { ...current, status };
    review.assignments[index] = next;
    return next;
  },
  getProfile(): ReviewerProfileView {
    return review.profile;
  },
  updateProfile(patch: Partial<ReviewerProfileView>): ReviewerProfileView {
    review.profile = { ...review.profile, ...patch };
    return review.profile;
  },
  getAvailability(): ReviewerAvailabilityView {
    return review.availability;
  },
  updateAvailability(patch: Partial<ReviewerAvailabilityView>): ReviewerAvailabilityView {
    review.availability = { ...review.availability, ...patch };
    return review.availability;
  },
  getTraining(): Collection<TrainingModuleView> {
    return { items: review.training, total: review.training.length };
  },
  getEvidence(): Collection<EvidenceItemView> {
    return { items: review.evidence, total: review.evidence.length };
  },
  markEvidenceReviewed(evidenceId: string): EvidenceItemView | null {
    const index = review.evidence.findIndex((e) => e.id === evidenceId);
    if (index === -1) return null;
    const current = review.evidence[index];
    if (current === undefined) return null;
    const next: EvidenceItemView = { ...current, status: 'reviewed' };
    review.evidence[index] = next;
    return next;
  },
  getScorecard(): Collection<CriterionView> {
    return { items: review.criteria, total: review.criteria.length };
  },
  saveCriterion(criterionId: string, score: number, rationale: string): CriterionView | null {
    const index = review.criteria.findIndex((c) => c.id === criterionId);
    if (index === -1) return null;
    const current = review.criteria[index];
    if (current === undefined) return null;
    const next: CriterionView = { ...current, score, rationale, state: 'saved' };
    review.criteria[index] = next;
    return next;
  },
  getObservations(): ObservationsView {
    // The reveal gate is server-enforced: even if items exist, they are concealed until scoring is
    // complete AND the reviewer has explicitly revealed them.
    const scoringComplete = allCriteriaScored();
    const revealed = review.observationsRevealed && scoringComplete;
    return {
      revealState: revealed ? 'revealed' : 'concealed',
      scoringComplete,
      items: revealed ? review.observations : [],
    };
  },
  revealObservations(): ObservationsView {
    if (allCriteriaScored()) review.observationsRevealed = true;
    return this.getObservations();
  },
  getIntegrity(): Collection<IntegrityFlagView> {
    return { items: review.integrity, total: review.integrity.length };
  },
  resolveIntegrity(
    flagId: string,
    status: 'dismissed' | 'upheld',
    resolution: string,
  ): IntegrityFlagView | null {
    const index = review.integrity.findIndex((f) => f.id === flagId);
    if (index === -1) return null;
    const current = review.integrity[index];
    if (current === undefined) return null;
    const next: IntegrityFlagView = { ...current, status, resolution };
    review.integrity[index] = next;
    return next;
  },
  getClarifications(): Collection<ClarificationView> {
    return { items: review.clarifications, total: review.clarifications.length };
  },
  sendClarification(topic: string, body: string, escalate: boolean): ClarificationView {
    const item: ClarificationView = {
      id: randomId('clr'),
      topic,
      body,
      status: escalate ? 'escalated' : 'sent',
      at: new Date().toISOString(),
    };
    review.clarifications.unshift(item);
    return item;
  },
  getSubmission(): ReviewSubmissionView {
    return {
      assignmentId: REVIEW_ASSIGNMENT_ID,
      allCriteriaScored: allCriteriaScored(),
      evidenceAllReviewed: review.evidence.every((e) => e.status === 'reviewed'),
      openIntegrityFlags: review.integrity.filter((f) => f.status === 'open').length,
      submittedAt: review.submittedAt,
      receiptRef: review.receiptRef,
    };
  },
  submit(): ReviewSubmissionView {
    // Idempotent, and blocked unless scoring is complete and no integrity flag is left open.
    const s = this.getSubmission();
    if (s.submittedAt === null && s.allCriteriaScored && s.openIntegrityFlags === 0) {
      review.submittedAt = new Date().toISOString();
      review.receiptRef = randomId('rrct').toUpperCase();
    }
    return this.getSubmission();
  },
  amend(): ReviewSubmissionView {
    // Re-open for amendment: mint a fresh receipt on the next submit.
    review.submittedAt = null;
    review.receiptRef = null;
    return this.getSubmission();
  },
  reset(): void {
    review = freshReview();
  },
};

// ── Employer admin store ───────────────────────────────────────────────────────────────────────
// Invariants: decisions are human-only (draft authored, then a separate approver issues — segregation
// of duties); no AI score/rank is ever stored or surfaced; accommodation clinical detail is kept out
// of the operational record; campaign activation and deployment are gated by explicit checks.

export const EMPLOYER_CAMPAIGN_ID = 'cmp_frontend_demo';
export const EMPLOYER_CANDIDATE_ID = 'cnd_frontend_demo';
export const EMPLOYER_APPLICATION_ID = 'app_frontend_demo';

interface EmployerState {
  org: EmployerOrgProfileView;
  members: MemberView[];
  departments: DepartmentView[];
  teams: TeamView[];
  campaigns: CampaignView[];
  preflight: PreflightCheckView[];
  exceptions: CampaignExceptionView[];
  candidates: EmployerCandidateView[];
  invitations: InvitationView[];
  windows: ScheduleWindowView[];
  accommodations: AccommodationRequestView[];
  reviewers: ReviewerAdminView[];
  assignments: AssignmentBoardItemView[];
  comparison: ComparisonRowView[];
  decision: DecisionDraftView;
  approval: DecisionApprovalView;
  reports: ReportView[];
  integrations: IntegrationView[];
  templates: TemplateView[];
  readiness: ReadinessItemView[];
}

function freshEmployer(): EmployerState {
  return {
    org: {
      displayName: 'Acme Talent',
      legalName: 'Acme Talent Ltd',
      defaultTimezone: 'Europe/London',
      supportEmail: 'talent@acme.example',
    },
    members: [
      {
        id: 'mbr_1',
        name: 'Dana Owner',
        email: 'dana@acme.example',
        roles: ['employer_admin'],
        status: 'active',
      },
      {
        id: 'mbr_2',
        name: 'Sam Recruiter',
        email: 'sam@acme.example',
        roles: ['recruiter'],
        status: 'active',
      },
      {
        id: 'mbr_3',
        name: 'Pat Pending',
        email: 'pat@acme.example',
        roles: ['recruiter'],
        status: 'invited',
      },
    ],
    departments: [
      { id: 'dep_eng', name: 'Engineering', teamCount: 2 },
      { id: 'dep_data', name: 'Data', teamCount: 1 },
    ],
    teams: [
      { id: 'tm_be', name: 'Backend', departmentId: 'dep_eng', departmentName: 'Engineering' },
      { id: 'tm_fe', name: 'Frontend', departmentId: 'dep_eng', departmentName: 'Engineering' },
      { id: 'tm_ml', name: 'ML', departmentId: 'dep_data', departmentName: 'Data' },
    ],
    campaigns: [
      {
        id: EMPLOYER_CAMPAIGN_ID,
        name: 'Backend engineers — Q3',
        roleTitle: 'Backend Engineer',
        status: 'draft',
        candidateCount: 12,
        openBlockers: 2,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: 'cmp_active_demo',
        name: 'Data analysts — rolling',
        roleTitle: 'Data Analyst',
        status: 'active',
        candidateCount: 34,
        openBlockers: 0,
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
    ],
    preflight: [
      {
        id: 'pf_rubric',
        label: 'Rubric approved',
        severity: 'ok',
        detail: 'A published rubric version is bound to this campaign.',
        resolved: true,
      },
      {
        id: 'pf_reviewers',
        label: 'Reviewer coverage',
        severity: 'blocker',
        detail: 'At least two eligible reviewers must be assigned before activation.',
        resolved: false,
      },
      {
        id: 'pf_dpia',
        label: 'DPIA acknowledgement',
        severity: 'blocker',
        detail: 'The data protection impact assessment must be acknowledged for this role.',
        resolved: false,
      },
      {
        id: 'pf_notice',
        label: 'Candidate notice',
        severity: 'warning',
        detail: 'A candidate transparency notice is recommended but not yet attached.',
        resolved: false,
      },
    ],
    exceptions: [
      {
        id: 'exc_1',
        summary: 'Two candidates paused mid-attempt (connection loss).',
        kind: 'runtime',
      },
      {
        id: 'exc_2',
        summary: 'One accommodation request awaiting a decision.',
        kind: 'accommodation',
      },
    ],
    candidates: [
      {
        id: EMPLOYER_CANDIDATE_ID,
        reference: 'CND-7F3A',
        displayName: 'Alex Candidate',
        status: 'active',
        campaignName: 'Backend engineers — Q3',
        applicationCount: 1,
      },
      {
        id: 'cnd_2',
        reference: 'CND-2B91',
        displayName: 'Jordan Candidate',
        status: 'invited',
        campaignName: 'Data analysts — rolling',
        applicationCount: 1,
      },
    ],
    invitations: [
      {
        id: 'inv_1',
        email: 'alex@example.test',
        campaignName: 'Backend engineers — Q3',
        status: 'accepted',
        sentAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: 'inv_2',
        email: 'jordan@example.test',
        campaignName: 'Data analysts — rolling',
        status: 'sent',
        sentAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
    windows: [
      {
        id: 'win_1',
        label: 'Morning cohort',
        startsAt: new Date(Date.now() + 2 * 86400000).toISOString(),
        capacity: 20,
        booked: 12,
        status: 'open',
      },
      {
        id: 'win_2',
        label: 'Afternoon cohort',
        startsAt: new Date(Date.now() + 2 * 86400000 + 6 * 3600000).toISOString(),
        capacity: 20,
        booked: 20,
        status: 'full',
      },
    ],
    accommodations: [
      {
        id: 'acc_1',
        candidateRef: 'CND-7F3A',
        category: 'Extra time',
        adjustmentSummary: '+25% time on all timed sections.',
        status: 'pending',
        decidedBy: null,
      },
    ],
    reviewers: [
      {
        id: 'rvw_1',
        name: 'Rivka Reviewer',
        disciplines: ['Backend'],
        status: 'active',
        activeAssignments: 3,
      },
      {
        id: 'rvw_2',
        name: 'Kofi Reviewer',
        disciplines: ['Data'],
        status: 'training',
        activeAssignments: 0,
      },
    ],
    assignments: [
      {
        id: 'asn_1',
        candidateRef: 'CND-7F3A',
        campaignName: 'Backend engineers — Q3',
        reviewerName: null,
        status: 'unassigned',
      },
      {
        id: 'asn_2',
        candidateRef: 'CND-2B91',
        campaignName: 'Data analysts — rolling',
        reviewerName: 'Kofi Reviewer',
        status: 'in_review',
      },
    ],
    comparison: [
      {
        applicationId: EMPLOYER_APPLICATION_ID,
        candidateRef: 'CND-7F3A',
        reviewStatus: 'submitted',
        criteriaScored: 3,
        criteriaTotal: 3,
      },
      {
        applicationId: 'app_2',
        candidateRef: 'CND-2B91',
        reviewStatus: 'in_review',
        criteriaScored: 1,
        criteriaTotal: 3,
      },
    ],
    decision: {
      applicationId: EMPLOYER_APPLICATION_ID,
      candidateRef: 'CND-7F3A',
      campaignName: 'Backend engineers — Q3',
      outcome: null,
      rationale: '',
      reviewComplete: true,
      status: 'draft',
    },
    approval: {
      applicationId: EMPLOYER_APPLICATION_ID,
      candidateRef: 'CND-7F3A',
      outcome: null,
      rationale: '',
      draftedBy: 'Sam Recruiter',
      status: 'awaiting_review',
      approver: null,
      issuedAt: null,
    },
    reports: [
      {
        id: 'rpt_1',
        name: 'Campaign funnel — Q3',
        kind: 'funnel',
        status: 'ready',
        generatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    integrations: [
      {
        id: 'int_ats',
        name: 'Greenhouse',
        kind: 'ats',
        status: 'connected',
        endpoint: 'https://api.greenhouse.example/hooks',
      },
      {
        id: 'int_hook',
        name: 'Decision webhook',
        kind: 'webhook',
        status: 'error',
        endpoint: 'https://acme.example/webhooks/decisions',
      },
    ],
    templates: [
      {
        id: 'tpl_invite',
        name: 'Assessment invitation',
        channel: 'email',
        subject: 'You have been invited to an assessment',
        updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
    ],
    readiness: [
      {
        id: 'rd_dpia',
        label: 'DPIA sign-off',
        severity: 'blocker',
        detail: 'Legal/DPO must approve the data protection impact assessment.',
        resolved: false,
      },
      {
        id: 'rd_oversight',
        label: 'Human oversight plan',
        severity: 'blocker',
        detail: 'A documented human oversight plan must be attached to this deployment.',
        resolved: false,
      },
      {
        id: 'rd_access',
        label: 'Access review',
        severity: 'warning',
        detail: 'Confirm member roles follow least-privilege before go-live.',
        resolved: false,
      },
    ],
  };
}

let employer: EmployerState = freshEmployer();

function campaign(id: string): CampaignView | undefined {
  return employer.campaigns.find((c) => c.id === id);
}

export const employerStore = {
  campaignId: EMPLOYER_CAMPAIGN_ID,
  candidateId: EMPLOYER_CANDIDATE_ID,
  applicationId: EMPLOYER_APPLICATION_ID,

  getDashboard(): EmployerDashboardView {
    return {
      orgName: employer.org.displayName,
      activeCampaigns: employer.campaigns.filter((c) => c.status === 'active').length,
      openApplications: employer.candidates.reduce((n, c) => n + c.applicationCount, 0),
      pendingDecisions: employer.approval.status === 'issued' ? 0 : 1,
      pendingAccommodations: employer.accommodations.filter((a) => a.status === 'pending').length,
      unassignedReviews: employer.assignments.filter((a) => a.status === 'unassigned').length,
      readinessBlockers: employer.readiness.filter((r) => r.severity === 'blocker' && !r.resolved)
        .length,
    };
  },

  getOrg(): EmployerOrgProfileView {
    return employer.org;
  },
  updateOrg(patch: Partial<EmployerOrgProfileView>): EmployerOrgProfileView {
    employer.org = { ...employer.org, ...patch };
    return employer.org;
  },

  getMembers(): Collection<MemberView> {
    return { items: employer.members, total: employer.members.length };
  },
  inviteMember(email: string, role: string): MemberView {
    const member: MemberView = {
      id: randomId('mbr'),
      name: email.split('@')[0] ?? email,
      email,
      roles: [role],
      status: 'invited',
    };
    employer.members.push(member);
    return member;
  },

  getStructure(): StructureView {
    return { departments: employer.departments, teams: employer.teams };
  },
  addDepartment(name: string): DepartmentView {
    const dep: DepartmentView = { id: randomId('dep'), name, teamCount: 0 };
    employer.departments.push(dep);
    return dep;
  },
  addTeam(name: string, departmentId: string): TeamView | null {
    const dep = employer.departments.find((d) => d.id === departmentId);
    if (dep === undefined) return null;
    const team: TeamView = { id: randomId('tm'), name, departmentId, departmentName: dep.name };
    employer.teams.push(team);
    const index = employer.departments.findIndex((d) => d.id === departmentId);
    employer.departments[index] = { ...dep, teamCount: dep.teamCount + 1 };
    return team;
  },

  getCampaigns(): Collection<CampaignView> {
    return { items: employer.campaigns, total: employer.campaigns.length };
  },
  getCampaign(id: string): CampaignView | null {
    return campaign(id) ?? null;
  },
  createCampaign(name: string, roleTitle: string): CampaignView {
    const c: CampaignView = {
      id: randomId('cmp'),
      name,
      roleTitle,
      status: 'draft',
      candidateCount: 0,
      openBlockers: 2,
      createdAt: new Date().toISOString(),
    };
    employer.campaigns.unshift(c);
    return c;
  },
  setCampaignStatus(id: string, status: CampaignStatus): CampaignView | null {
    const index = employer.campaigns.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const current = employer.campaigns[index];
    if (current === undefined) return null;
    // Activation is gated: cannot activate while blockers remain open.
    if (status === 'active' && current.openBlockers > 0) return current;
    const next: CampaignView = { ...current, status };
    employer.campaigns[index] = next;
    return next;
  },

  getPreflight(): Collection<PreflightCheckView> {
    return { items: employer.preflight, total: employer.preflight.length };
  },
  resolvePreflight(checkId: string): PreflightCheckView | null {
    const index = employer.preflight.findIndex((p) => p.id === checkId);
    if (index === -1) return null;
    const current = employer.preflight[index];
    if (current === undefined) return null;
    const next: PreflightCheckView = { ...current, resolved: true, severity: 'ok' };
    employer.preflight[index] = next;
    // Recompute the demo campaign's open blockers from unresolved blocker checks.
    const openBlockers = employer.preflight.filter(
      (p) => p.severity === 'blocker' && !p.resolved,
    ).length;
    const ci = employer.campaigns.findIndex((c) => c.id === EMPLOYER_CAMPAIGN_ID);
    const cc = employer.campaigns[ci];
    if (cc !== undefined) employer.campaigns[ci] = { ...cc, openBlockers };
    return next;
  },

  getCampaignOps(id: string): CampaignOpsView {
    return {
      campaignId: id,
      invited: 12,
      inProgress: 4,
      submitted: 5,
      underReview: 2,
      decided: 1,
      exceptions: employer.exceptions,
    };
  },
  getComparison(): Collection<ComparisonRowView> {
    return { items: employer.comparison, total: employer.comparison.length };
  },

  getCandidates(): Collection<EmployerCandidateView> {
    return { items: employer.candidates, total: employer.candidates.length };
  },
  addCandidate(displayName: string, campaignName: string): EmployerCandidateView {
    const c: EmployerCandidateView = {
      id: randomId('cnd'),
      reference: `CND-${randomId('').slice(0, 4).toUpperCase()}`,
      displayName,
      status: 'invited',
      campaignName,
      applicationCount: 0,
    };
    employer.candidates.push(c);
    return c;
  },
  getCandidate(id: string): CandidateRecordView | null {
    const c = employer.candidates.find((x) => x.id === id);
    if (c === undefined) return null;
    return {
      id: c.id,
      reference: c.reference,
      displayName: c.displayName,
      status: c.status,
      email: `${c.displayName.split(' ')[0]?.toLowerCase() ?? 'candidate'}@example.test`,
      applications: [
        { id: EMPLOYER_APPLICATION_ID, campaignName: c.campaignName, status: 'under_review' },
      ],
      accommodationsNote:
        'One approved operational adjustment on file. Clinical detail is segregated.',
    };
  },
  mergeCandidate(id: string, duplicateId: string): CandidateRecordView | null {
    const dupIndex = employer.candidates.findIndex((c) => c.id === duplicateId);
    if (dupIndex !== -1) {
      const dup = employer.candidates[dupIndex];
      if (dup !== undefined) employer.candidates[dupIndex] = { ...dup, status: 'merged' };
    }
    return this.getCandidate(id);
  },

  validateImport(rowText: string): ImportResultView {
    const rows = rowText.split('\n').filter((r) => r.trim().length > 0);
    const errors = rows
      .map((r, i) => ({ row: i + 1, value: r }))
      .filter((r) => !r.value.includes('@'))
      .map((r) => ({ row: r.row, message: 'Missing a valid email address.' }));
    return {
      stage: 'validated',
      totalRows: rows.length,
      validRows: rows.length - errors.length,
      errors,
    };
  },
  commitImport(rowText: string): ImportResultView {
    const validated = this.validateImport(rowText);
    return { ...validated, stage: 'committed' };
  },

  getInvitations(): Collection<InvitationView> {
    return { items: employer.invitations, total: employer.invitations.length };
  },
  sendInvitation(email: string, campaignName: string): InvitationView {
    const inv: InvitationView = {
      id: randomId('inv'),
      email,
      campaignName,
      status: 'sent',
      sentAt: new Date().toISOString(),
    };
    employer.invitations.unshift(inv);
    return inv;
  },

  getWindows(): Collection<ScheduleWindowView> {
    return { items: employer.windows, total: employer.windows.length };
  },
  addWindow(label: string, capacity: number): ScheduleWindowView {
    const w: ScheduleWindowView = {
      id: randomId('win'),
      label,
      startsAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      capacity,
      booked: 0,
      status: 'open',
    };
    employer.windows.push(w);
    return w;
  },

  getAccommodations(): Collection<AccommodationRequestView> {
    return { items: employer.accommodations, total: employer.accommodations.length };
  },
  decideAccommodation(
    id: string,
    status: 'approved' | 'declined' | 'more_info',
  ): AccommodationRequestView | null {
    const index = employer.accommodations.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const current = employer.accommodations[index];
    if (current === undefined) return null;
    const next: AccommodationRequestView = { ...current, status, decidedBy: 'Dana Owner' };
    employer.accommodations[index] = next;
    return next;
  },

  getReviewers(): Collection<ReviewerAdminView> {
    return { items: employer.reviewers, total: employer.reviewers.length };
  },
  inviteReviewer(name: string, discipline: string): ReviewerAdminView {
    const r: ReviewerAdminView = {
      id: randomId('rvw'),
      name,
      disciplines: [discipline],
      status: 'invited',
      activeAssignments: 0,
    };
    employer.reviewers.push(r);
    return r;
  },

  getAssignments(): Collection<AssignmentBoardItemView> {
    return { items: employer.assignments, total: employer.assignments.length };
  },
  assignReviewer(id: string, reviewerName: string): AssignmentBoardItemView | null {
    const index = employer.assignments.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const current = employer.assignments[index];
    if (current === undefined) return null;
    const next: AssignmentBoardItemView = { ...current, reviewerName, status: 'assigned' };
    employer.assignments[index] = next;
    return next;
  },

  getDecision(): DecisionDraftView {
    return employer.decision;
  },
  saveDecision(outcome: DecisionOutcome, rationale: string): DecisionDraftView {
    // A human decision requires completed review and a written rationale (enforced at the boundary).
    employer.decision = { ...employer.decision, outcome, rationale, status: 'submitted' };
    employer.approval = {
      ...employer.approval,
      outcome,
      rationale,
      status: 'awaiting_approval',
    };
    return employer.decision;
  },

  getApproval(): DecisionApprovalView {
    return employer.approval;
  },
  approveDecision(): DecisionApprovalView {
    // Segregation of duties: only a submitted draft awaiting approval can be issued.
    if (employer.approval.status === 'awaiting_approval') {
      employer.approval = {
        ...employer.approval,
        status: 'issued',
        approver: 'Dana Owner',
        issuedAt: new Date().toISOString(),
      };
    }
    return employer.approval;
  },
  returnDecision(): DecisionApprovalView {
    if (employer.approval.status === 'awaiting_approval') {
      employer.approval = { ...employer.approval, status: 'returned' };
      employer.decision = { ...employer.decision, status: 'draft' };
    }
    return employer.approval;
  },

  getReports(): Collection<ReportView> {
    return { items: employer.reports, total: employer.reports.length };
  },
  generateReport(name: string, kind: string): ReportView {
    const r: ReportView = {
      id: randomId('rpt'),
      name,
      kind,
      status: 'ready',
      generatedAt: new Date().toISOString(),
    };
    employer.reports.unshift(r);
    return r;
  },

  getIntegrations(): Collection<IntegrationView> {
    return { items: employer.integrations, total: employer.integrations.length };
  },
  addIntegration(name: string, kind: string, endpoint: string): IntegrationView {
    const i: IntegrationView = {
      id: randomId('int'),
      name,
      kind,
      status: 'connected',
      endpoint,
    };
    employer.integrations.push(i);
    return i;
  },

  getTemplates(): Collection<TemplateView> {
    return { items: employer.templates, total: employer.templates.length };
  },
  createTemplate(name: string, subject: string): TemplateView {
    const t: TemplateView = {
      id: randomId('tpl'),
      name,
      channel: 'email',
      subject,
      updatedAt: new Date().toISOString(),
    };
    employer.templates.unshift(t);
    return t;
  },

  getReadiness(): Collection<ReadinessItemView> {
    return { items: employer.readiness, total: employer.readiness.length };
  },
  resolveReadiness(itemId: string): ReadinessItemView | null {
    const index = employer.readiness.findIndex((r) => r.id === itemId);
    if (index === -1) return null;
    const current = employer.readiness[index];
    if (current === undefined) return null;
    const next: ReadinessItemView = { ...current, resolved: true, severity: 'ready' };
    employer.readiness[index] = next;
    return next;
  },

  reset(): void {
    employer = freshEmployer();
  },
};
