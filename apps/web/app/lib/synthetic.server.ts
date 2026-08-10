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
  ImportRowActionView,
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
import type {
  AccessGrantView,
  AdminDashboardView,
  AdminSupportCaseView,
  AuditEventView,
  FeatureFlagView,
  JobStatus,
  JobView,
  ReleaseView,
  SubscriptionView,
  TenantDetailView,
  TenantStaffView,
  TenantStatus,
  TenantView,
} from './types';
import type {
  AiEvaluationView,
  AiModelDetailView,
  AiModelStatus,
  AiModelView,
  AssessmentDetailView,
  AssessmentPreviewView,
  AssessmentStatus,
  AssessmentValidationView,
  AssessmentVersionStatus,
  AssessmentVersionView,
  AssessmentView,
  DefectSeverity,
  DefectView,
  PluginView,
  PromptVersionView,
  RiskTier,
} from './types';
import type {
  AiLiteracyView,
  AiSystemView,
  ChangeRequestView,
  ClassificationView,
  ConformityAssessmentView,
  DatasetView,
  DataUseView,
  DeployerInstructionsView,
  EvidenceCollectionView,
  ImpactAssessmentView,
  IncidentSeverity,
  MarketAccessType,
  MarketAccessView,
  OversightPlanView,
  PostMarketPlanView,
  QmsProcedureView,
  RiskView,
  SeriousIncidentView,
  SignalDashboardView,
  SignalPriority,
  SignalType,
  SignalView,
  TechnicalDocView,
  TraceabilityView,
  VendorEvidenceView,
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
  // New methods for CAN-02, CAN-03, CAN-06, CAN-07, CAN-09, CAN-10, CAN-13
  async getCandidateProfile() {
    return {
      fullName: 'Jordan Smith',
      email: 'jordan.smith@example.com',
      dateOfBirth: '1995-03-15',
      phone: '+353 87 123 4567',
    };
  },
  async submitProfileCorrection(
    field: string,
    currentValue: string,
    correctedValue: string,
    reason: string,
  ) {
    console.log(
      `Profile correction: ${field} from "${currentValue}" to "${correctedValue}" - ${reason}`,
    );
  },
  async getCandidateNotices() {
    const notices = [
      {
        id: '1',
        title: 'Data Processing and Your Rights',
        content:
          '<p>We process your personal data to assess your suitability for employment. You have the right to access, correct, and request deletion of your data.</p><p>AI-assisted scoring is used but all final decisions are reviewed by qualified humans.</p>',
        category: 'Privacy & Data',
        acknowledged: false,
      },
      {
        id: '2',
        title: 'Assessment Monitoring Notice',
        content:
          '<p>Your assessment session will be monitored using webcam, screen recording, and keystroke analysis to detect potential integrity violations.</p><p>All recordings are securely stored and reviewed only when needed.</p>',
        category: 'Monitoring',
        acknowledged: false,
      },
      {
        id: '3',
        title: 'Algorithmic Decision Making',
        content:
          '<p>Parts of your application may be scored algorithmically. You have the right to request human review of any decision that significantly affects your application.</p>',
        category: 'AI & Decisions',
        acknowledged: false,
      },
    ];
    const allAcknowledged = notices.every((n) => n.acknowledged);
    return { notices, allAcknowledged };
  },
  async acknowledgeCandidateNotice(noticeId: string) {
    console.log(`Notice ${noticeId} acknowledged`);
  },
  async getPracticeModules() {
    return {
      modules: [
        {
          id: '1',
          title: 'Spreadsheet Task Practice',
          description:
            'Practice working with spreadsheet data, formulas, and analysis in a simulated environment.',
          duration: '15',
          taskCount: 3,
          completed: false,
        },
        {
          id: '2',
          title: 'Document Task Practice',
          description: 'Familiarize yourself with the document editing and formatting interface.',
          duration: '10',
          taskCount: 2,
          completed: true,
        },
        {
          id: '3',
          title: 'Code Task Practice',
          description: 'Test the code editor with syntax highlighting and execution.',
          duration: '20',
          taskCount: 4,
          completed: false,
        },
      ],
    };
  },
  async getSystemChecks() {
    return {
      checks: [
        {
          id: '1',
          name: 'Browser compatibility',
          description: 'Check if your browser meets minimum requirements',
          status: 'not_started' as const,
          required: true,
        },
        {
          id: '2',
          name: 'Webcam access',
          description: 'Verify webcam is available and working',
          status: 'not_started' as const,
          required: true,
        },
        {
          id: '3',
          name: 'Microphone access',
          description: 'Verify microphone is available',
          status: 'not_started' as const,
          required: true,
        },
        {
          id: '4',
          name: 'Network speed',
          description: 'Test upload and download speeds',
          status: 'not_started' as const,
          required: true,
        },
        {
          id: '5',
          name: 'Desktop companion',
          description: 'Check if desktop monitoring application is installed',
          status: 'not_started' as const,
          required: false,
        },
        {
          id: '6',
          name: 'Screen recording',
          description: 'Verify screen recording permissions',
          status: 'not_started' as const,
          required: true,
        },
      ],
      overallStatus: 'not_started' as const,
    };
  },
  async runSystemChecks() {
    return {
      checks: [
        {
          id: '1',
          name: 'Browser compatibility',
          description: 'Check if your browser meets minimum requirements',
          status: 'passed' as const,
          message: 'Chrome 120.0 detected - fully supported',
          required: true,
        },
        {
          id: '2',
          name: 'Webcam access',
          description: 'Verify webcam is available and working',
          status: 'passed' as const,
          message: 'Webcam detected and accessible',
          required: true,
        },
        {
          id: '3',
          name: 'Microphone access',
          description: 'Verify microphone is available',
          status: 'passed' as const,
          message: 'Microphone detected and accessible',
          required: true,
        },
        {
          id: '4',
          name: 'Network speed',
          description: 'Test upload and download speeds',
          status: 'passed' as const,
          message: 'Download: 45 Mbps, Upload: 12 Mbps - sufficient',
          required: true,
        },
        {
          id: '5',
          name: 'Desktop companion',
          description: 'Check if desktop monitoring application is installed',
          status: 'warning' as const,
          message: 'Desktop companion not detected - optional but recommended',
          required: false,
        },
        {
          id: '6',
          name: 'Screen recording',
          description: 'Verify screen recording permissions',
          status: 'passed' as const,
          message: 'Screen recording permission granted',
          required: true,
        },
      ],
      overallStatus: 'passed' as const,
    };
  },
  async getReviewableDecisions() {
    return {
      decisions: [
        {
          id: '1',
          decisionType: 'Application screening',
          outcome: 'Not shortlisted',
          reasoning:
            'Based on automated scoring of experience and qualifications against role requirements, your application did not meet the minimum threshold.',
          decidedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          canRequest: true,
          reviewRequested: false,
        },
      ],
    };
  },
  async requestHumanReview(decisionId: string, grounds: string) {
    console.log(`Human review requested for decision ${decisionId}: ${grounds}`);
  },
  async getCandidateTickets() {
    const tickets = [
      {
        id: '1',
        subject: 'Cannot access assessment link',
        category: 'Technical',
        status: 'open' as const,
        priority: 'high' as const,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        subject: 'Question about application status',
        category: 'Application',
        status: 'in_progress' as const,
        priority: 'medium' as const,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
    ];
    return { items: tickets, total: tickets.length };
  },
  async createCandidateTicket(subject: string, category: string, _description: string) {
    return {
      id: randomId('tkt'),
      subject,
      category,
      status: 'open' as const,
      priority: 'medium' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  async getApplicationDetail(id: string) {
    return {
      id,
      campaignTitle: 'Graduate Software Engineer Programme 2026',
      roleTitle: 'Software Engineer',
      appliedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'under_review' as const,
    };
  },
  async withdrawApplication(id: string) {
    console.log(`Application ${id} withdrawn`);
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
    deadlineAt: Date.now() + (82 * 60 + 16) * 1000,
    autosave: 'saved',
    submittedAt: null,
    receiptRef: null,
    tasks: [
      {
        id: 'task_doc',
        sectionId: 'sec_written',
        kind: 'document',
        title: 'Task 1 · Design rationale',
        prompt:
          'Explain how you would structure a reusable component library for a design system. Cover tokens, theming and accessibility.',
        status: 'saved',
        response:
          'The token layer is the stable contract. Components consume semantic variables so theme changes never alter interaction or accessibility behaviour.',
        savedAt: '2026-08-10T13:52:00.000Z',
        flagged: false,
        version: 2,
        checksum: '9b84c1a2',
      },
      {
        id: 'task_applied',
        sectionId: 'sec_practical',
        kind: 'document',
        title: 'Task 2 · Applied task',
        prompt:
          'Identify the operational constraint, separate verified facts from assumptions, then propose a reversible first step.',
        status: 'in_progress',
        response:
          'The confirmed constraint is the four-hour recovery window. I would first isolate the affected queue, preserve the current evidence, and validate capacity before changing the wider workflow.',
        savedAt: '2026-08-10T14:18:00.000Z',
        flagged: false,
        version: 3,
        checksum: '72d6f4c9',
      },
      {
        id: 'task_code',
        sectionId: 'sec_practical',
        kind: 'code',
        title: 'Task 3 · Recovery utility',
        prompt:
          'Implement a typed `debounce(fn, waitMs)` helper and describe how you would test it. Run the sample tests when ready.',
        status: 'not_started',
        response: '',
        savedAt: null,
        flagged: false,
        version: 1,
        checksum: 'e3b0c442',
      },
      {
        id: 'task_sheet',
        sectionId: 'sec_practical',
        kind: 'sheet',
        title: 'Task 4 · Data reconciliation',
        prompt:
          'Using the provided workbook, reconcile the two ledgers and summarise the discrepancies. Validate before saving.',
        status: 'not_started',
        response: '',
        savedAt: null,
        flagged: false,
        version: 1,
        checksum: 'e3b0c442',
      },
      {
        id: 'task_playbook',
        sectionId: 'sec_practical',
        kind: 'document',
        title: 'Task 5 · Incident playbook',
        prompt:
          'Write a concise escalation playbook covering owner, evidence, rollback, communication and follow-up.',
        status: 'not_started',
        response: '',
        savedAt: null,
        flagged: false,
        version: 1,
        checksum: 'e3b0c442',
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
  {
    id: 'sec_practical',
    title: 'Section 2 · Applied task',
    taskIds: ['task_applied', 'task_code', 'task_sheet', 'task_playbook'],
  },
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
    assessmentTitle: 'Operational judgement exercise (Synthetic demo)',
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
          version: current.version + 1,
          checksum: `${response.length.toString(16).padStart(4, '0')}${(
            response.length * 2654435761
          )
            .toString(16)
            .slice(-4)}`,
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
        criterionCount: 5,
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
        title: 'Task 2 · Candidate response',
        kind: 'document',
        excerpt: 'The service is partitioned by tenant with row-level security enforced at the…',
        status: 'reviewed',
        version: 3,
        sourceLabel: 'Task 2 · paragraph 2',
      },
      {
        id: 'ev_code',
        title: 'Debounce implementation',
        kind: 'code',
        excerpt: 'export function debounce(fn, wait) { let t; return (...args) => { … } }',
        status: 'unreviewed',
        version: 2,
        sourceLabel: 'Task 3 · code lines 1–18',
      },
      {
        id: 'ev_sheet',
        title: 'Capacity model',
        kind: 'sheet',
        excerpt: 'Peak RPS = concurrent_users × requests_per_min ÷ 60 …',
        status: 'unreviewed',
        version: 1,
        sourceLabel: 'Task 4 · reconciliation summary',
      },
    ],
    criteria: [
      {
        id: 'cri_correctness',
        label: 'Evidence-led judgement',
        descriptor: 'Solution meets the stated requirements and handles edge cases.',
        maxScore: 5,
        score: 3,
        rationale:
          'The response proposes a reversible first step and separates verified facts from assumptions.',
        state: 'saved',
        evidenceLink: 'Task 2 · paragraph 2',
        insufficientEvidence: false,
      },
      {
        id: 'cri_design',
        label: 'Design quality',
        descriptor: 'Structure, naming and separation of concerns are sound.',
        maxScore: 5,
        score: null,
        rationale: '',
        state: 'draft',
        evidenceLink: 'Task 3 · code lines 1–18',
        insufficientEvidence: false,
      },
      {
        id: 'cri_communication',
        label: 'Communication',
        descriptor: 'Reasoning and trade-offs are explained clearly.',
        maxScore: 5,
        score: null,
        rationale: '',
        state: 'draft',
        evidenceLink: 'Task 2 · paragraph 2',
        insufficientEvidence: false,
      },
      {
        id: 'cri_risk',
        label: 'Risk awareness',
        descriptor: 'Operational risk, rollback and escalation are treated proportionately.',
        maxScore: 5,
        score: null,
        rationale: '',
        state: 'draft',
        evidenceLink: 'Task 2 · paragraph 2',
        insufficientEvidence: false,
      },
      {
        id: 'cri_delivery',
        label: 'Delivery judgement',
        descriptor: 'The proposed sequence is practical, reversible and clearly owned.',
        maxScore: 5,
        score: null,
        rationale: '',
        state: 'draft',
        evidenceLink: 'Task 4 · reconciliation summary',
        insufficientEvidence: false,
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
  saveCriterion(
    criterionId: string,
    score: number,
    rationale: string,
    evidenceLink: string,
    insufficientEvidence: boolean,
  ): CriterionView | null {
    const index = review.criteria.findIndex((c) => c.id === criterionId);
    if (index === -1) return null;
    const current = review.criteria[index];
    if (current === undefined) return null;
    const next: CriterionView = {
      ...current,
      score,
      rationale,
      evidenceLink,
      insufficientEvidence,
      state: 'saved',
    };
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
      {
        id: '11111111-0000-4000-8000-000000000210',
        reference: 'CND-8D42',
        displayName: 'Morgan Candidate',
        status: 'invited',
        campaignName: 'Warehouse Systems Engineers — Autumn 2026',
        applicationCount: 1,
      },
      {
        id: '11111111-0000-4000-8000-000000000213',
        reference: 'CND-4C18',
        displayName: 'Taylor Candidate',
        status: 'withdrawn',
        campaignName: 'Data Analysts — Rolling',
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
      {
        id: '11111111-0000-4000-8000-000000000212',
        email: 'morgan@example.test',
        campaignName: 'Warehouse Systems Engineers — Autumn 2026',
        status: 'sent',
        sentAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '11111111-0000-4000-8000-000000000215',
        email: 'taylor@example.test',
        campaignName: 'Data Analysts — Rolling',
        status: 'expired',
        sentAt: new Date(Date.now() - 12 * 86400000).toISOString(),
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

interface SyntheticImportRow {
  readonly id: string;
  readonly row: number;
  readonly value: string;
  readonly action: ImportRowActionView;
}

interface SyntheticImportJob {
  readonly id: string;
  readonly fileName: string;
  readonly rows: SyntheticImportRow[];
  committed: boolean;
}

const syntheticImports = new Map<string, SyntheticImportJob>();

function importErrors(job: SyntheticImportJob, row: SyntheticImportRow): readonly string[] {
  if (row.action === 'exclude') return [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.value)) {
    return ['Enter a valid email address.'];
  }
  if (
    row.action === 'include' &&
    job.rows.some(
      (candidate) =>
        candidate.id !== row.id && candidate.value.toLowerCase() === row.value.toLowerCase(),
    )
  ) {
    return ['Duplicate email in this import. Exclude the duplicate or keep it separate.'];
  }
  return [];
}

function maskImportValue(value: string): string {
  const [local = '', domain] = value.split('@');
  if (domain === undefined) return `${local[0] ?? ''}•••`;
  return `${local[0] ?? ''}${'•'.repeat(Math.min(6, Math.max(2, local.length - 1)))}@${domain}`;
}

function projectSyntheticImport(job: SyntheticImportJob): ImportResultView {
  const rows = job.rows.map((row) => {
    const errors = importErrors(job, row);
    return {
      id: row.id,
      row: row.row,
      displayValue: maskImportValue(row.value),
      status: job.committed
        ? ('committed' as const)
        : row.action === 'exclude'
          ? ('excluded' as const)
          : errors.length === 0
            ? ('valid' as const)
            : ('invalid' as const),
      action: row.action,
      errors,
      duplicateCandidateId: null,
    };
  });
  return {
    importId: job.id,
    stage: job.committed ? 'committed' : 'validated',
    status: job.committed ? 'completed' : 'preview_ready',
    fileName: job.fileName,
    totalRows: rows.length,
    validRows: rows.filter((row) => row.status === 'valid' || row.status === 'committed').length,
    errors: rows.flatMap((row) => row.errors.map((message) => ({ row: row.row, message }))),
    rows,
  };
}

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

  validateImport(rowText: string, fileName = 'candidate-import.csv'): ImportResultView {
    const job: SyntheticImportJob = {
      id: randomId('import'),
      fileName,
      rows: rowText
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map((value, index) => ({
          id: randomId('import_row'),
          row: index + 1,
          value,
          action: 'include' as const,
        })),
      committed: false,
    };
    syntheticImports.set(job.id, job);
    return projectSyntheticImport(job);
  },
  updateImport(
    importId: string,
    rowId: string,
    action: ImportRowActionView,
    value?: string,
  ): ImportResultView | null {
    const job = syntheticImports.get(importId);
    if (job === undefined || job.committed) return null;
    const index = job.rows.findIndex((row) => row.id === rowId);
    const row = job.rows[index];
    if (row === undefined) return null;
    job.rows[index] = { ...row, action, ...(value === undefined ? {} : { value: value.trim() }) };
    return projectSyntheticImport(job);
  },
  commitImport(importId: string): ImportResultView | null {
    const job = syntheticImports.get(importId);
    if (job === undefined) return null;
    if (projectSyntheticImport(job).errors.length > 0) return null;
    job.committed = true;
    return projectSyntheticImport(job);
  },
  cancelImport(importId: string): boolean {
    return syntheticImports.delete(importId);
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
    syntheticImports.clear();
  },
};

// ── Platform admin store (CPF Super Admin) ─────────────────────────────────────────────────────
// Invariants: privileged access is time-bound, justified, approved and visible; no silent impersonation.

export const ADMIN_TENANT_ID = 'tnt_frontend_demo';

interface AdminState {
  tenants: TenantView[];
  staff: TenantStaffView[];
  subscription: SubscriptionView;
  flags: FeatureFlagView[];
  jobs: JobView[];
  audit: AuditEventView[];
  releases: ReleaseView[];
  cases: AdminSupportCaseView[];
  grants: AccessGrantView[];
}

function freshAdmin(): AdminState {
  return {
    tenants: [
      {
        id: ADMIN_TENANT_ID,
        name: 'Acme Talent',
        slug: 'acme',
        status: 'active',
        plan: 'Scale',
        staffCount: 3,
        createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      },
      {
        id: 'tnt_globex',
        name: 'Globex',
        slug: 'globex',
        status: 'trial',
        plan: 'Trial',
        staffCount: 1,
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ],
    staff: [
      {
        id: 'stf_1',
        name: 'Dana Owner',
        email: 'dana@acme.example',
        role: 'employer_admin',
        status: 'active',
      },
      {
        id: 'stf_2',
        name: 'Sam Recruiter',
        email: 'sam@acme.example',
        role: 'recruiter',
        status: 'active',
      },
    ],
    subscription: {
      tenantId: ADMIN_TENANT_ID,
      plan: 'Scale',
      seatsLimit: 25,
      effectiveFrom: new Date(Date.now() - 60 * 86400000).toISOString(),
      renewsAt: new Date(Date.now() + 305 * 86400000).toISOString(),
    },
    flags: [
      {
        id: 'flg_ai',
        key: 'governed_ai_panel',
        description: 'Enable the governed AI assistance panel in runtime.',
        enabled: true,
        rollout: '100%',
      },
      {
        id: 'flg_beta',
        key: 'beta_reports',
        description: 'New employer report types.',
        enabled: false,
        rollout: '0%',
      },
    ],
    jobs: [
      {
        id: 'job_1',
        name: 'nightly-evidence-bundle',
        status: 'complete',
        attempts: 1,
        queuedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
      },
      {
        id: 'job_2',
        name: 'webhook-redelivery',
        status: 'failed',
        attempts: 3,
        queuedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
    ],
    audit: [
      {
        id: 'aud_1',
        actor: 'dana@acme.example',
        action: 'campaign.activate',
        target: 'cmp_active_demo',
        at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'aud_2',
        actor: 'super@cpf.example',
        action: 'tenant.suspend',
        target: 'tnt_old',
        at: new Date(Date.now() - 5 * 3600000).toISOString(),
      },
    ],
    releases: [
      {
        id: 'rel_1',
        title: 'DB maintenance — EU region',
        kind: 'maintenance',
        status: 'scheduled',
        window: new Date(Date.now() + 3 * 86400000).toISOString(),
      },
    ],
    cases: [
      {
        id: 'cse_1',
        subject: 'Candidate cannot start attempt',
        tenantName: 'Acme Talent',
        priority: 'high',
        status: 'new',
        assignee: null,
      },
    ],
    grants: [
      {
        id: 'grt_1',
        requester: 'agent@cpf.example',
        scope: 'tenant:acme read-only',
        justification: 'Investigate reported attempt failure (ticket SUP-1042).',
        status: 'requested',
        expiresAt: null,
        approver: null,
      },
    ],
  };
}

let admin: AdminState = freshAdmin();

export const adminStore = {
  tenantId: ADMIN_TENANT_ID,

  getDashboard(): AdminDashboardView {
    return {
      tenants: admin.tenants.length,
      activeIncidents: 0,
      failedJobs: admin.jobs.filter((j) => j.status === 'failed').length,
      openAccessGrants: admin.grants.filter(
        (g) => g.status === 'requested' || g.status === 'active',
      ).length,
      alerts: [
        { id: 'alt_1', severity: 'warning', message: 'One background job failed and needs retry.' },
        {
          id: 'alt_2',
          severity: 'info',
          message: 'A privileged access request is awaiting approval.',
        },
      ],
    };
  },

  getTenants(): Collection<TenantView> {
    return { items: admin.tenants, total: admin.tenants.length };
  },
  createTenant(name: string, slug: string): TenantView {
    const t: TenantView = {
      id: randomId('tnt'),
      name,
      slug,
      status: 'trial',
      plan: 'Trial',
      staffCount: 0,
      createdAt: new Date().toISOString(),
    };
    admin.tenants.unshift(t);
    return t;
  },
  getTenant(id: string): TenantDetailView | null {
    const t = admin.tenants.find((x) => x.id === id);
    if (t === undefined) return null;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      plan: t.plan,
      region: 'eu-west',
      seatsUsed: t.staffCount,
      seatsLimit: admin.subscription.seatsLimit,
    };
  },
  setTenantStatus(id: string, status: TenantStatus): TenantDetailView | null {
    const index = admin.tenants.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const current = admin.tenants[index];
    if (current === undefined) return null;
    admin.tenants[index] = { ...current, status };
    return this.getTenant(id);
  },

  getStaff(): Collection<TenantStaffView> {
    return { items: admin.staff, total: admin.staff.length };
  },
  inviteStaff(email: string, role: string): TenantStaffView {
    const s: TenantStaffView = {
      id: randomId('stf'),
      name: email.split('@')[0] ?? email,
      email,
      role,
      status: 'invited',
    };
    admin.staff.push(s);
    return s;
  },

  getSubscription(): SubscriptionView {
    return admin.subscription;
  },
  updateSubscription(plan: string, seatsLimit: number): SubscriptionView {
    admin.subscription = { ...admin.subscription, plan, seatsLimit };
    return admin.subscription;
  },

  getFlags(): Collection<FeatureFlagView> {
    return { items: admin.flags, total: admin.flags.length };
  },
  createFlag(key: string, description: string): FeatureFlagView {
    const f: FeatureFlagView = {
      id: randomId('flg'),
      key,
      description,
      enabled: false,
      rollout: '0%',
    };
    admin.flags.push(f);
    return f;
  },
  toggleFlag(id: string): FeatureFlagView | null {
    const index = admin.flags.findIndex((f) => f.id === id);
    if (index === -1) return null;
    const current = admin.flags[index];
    if (current === undefined) return null;
    const enabled = !current.enabled;
    const next: FeatureFlagView = { ...current, enabled, rollout: enabled ? '100%' : '0%' };
    admin.flags[index] = next;
    return next;
  },

  getJobs(): Collection<JobView> {
    return { items: admin.jobs, total: admin.jobs.length };
  },
  actOnJob(id: string, action: 'retry' | 'cancel'): JobView | null {
    const index = admin.jobs.findIndex((j) => j.id === id);
    if (index === -1) return null;
    const current = admin.jobs[index];
    if (current === undefined) return null;
    const status: JobStatus = action === 'retry' ? 'queued' : 'cancelled';
    const next: JobView = {
      ...current,
      status,
      attempts: action === 'retry' ? current.attempts + 1 : current.attempts,
    };
    admin.jobs[index] = next;
    return next;
  },

  getAudit(): Collection<AuditEventView> {
    return { items: admin.audit, total: admin.audit.length };
  },

  getReleases(): Collection<ReleaseView> {
    return { items: admin.releases, total: admin.releases.length };
  },
  scheduleRelease(title: string, kind: 'maintenance' | 'release'): ReleaseView {
    const r: ReleaseView = {
      id: randomId('rel'),
      title,
      kind,
      status: 'scheduled',
      window: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    admin.releases.unshift(r);
    return r;
  },

  getCases(): Collection<AdminSupportCaseView> {
    return { items: admin.cases, total: admin.cases.length };
  },
  assignCase(id: string, assignee: string): AdminSupportCaseView | null {
    const index = admin.cases.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const current = admin.cases[index];
    if (current === undefined) return null;
    const next: AdminSupportCaseView = { ...current, assignee, status: 'assigned' };
    admin.cases[index] = next;
    return next;
  },

  getGrants(): Collection<AccessGrantView> {
    return { items: admin.grants, total: admin.grants.length };
  },
  requestGrant(scope: string, justification: string): AccessGrantView {
    const g: AccessGrantView = {
      id: randomId('grt'),
      requester: 'you@cpf.example',
      scope,
      justification,
      status: 'requested',
      expiresAt: null,
      approver: null,
    };
    admin.grants.unshift(g);
    return g;
  },
  actOnGrant(id: string, action: 'approve' | 'revoke'): AccessGrantView | null {
    const index = admin.grants.findIndex((g) => g.id === id);
    if (index === -1) return null;
    const current = admin.grants[index];
    if (current === undefined) return null;
    let next: AccessGrantView;
    if (action === 'approve') {
      next = {
        ...current,
        status: 'active',
        approver: 'super@cpf.example',
        expiresAt: new Date(Date.now() + 2 * 3600000).toISOString(),
      };
    } else {
      next = { ...current, status: 'revoked' };
    }
    admin.grants[index] = next;
    return next;
  },

  reset(): void {
    admin = freshAdmin();
  },
};

// ── Assessment governance store (Assessment Admin / AI Governance / Plugin Admin) ──────────────
// Invariants: versions are immutable; activation requires resolved validation / recorded evaluation
// and human approvals; no AI output is produced on these governance surfaces.

export const ASSESSMENT_ID = 'asm_frontend_demo';
export const AI_MODEL_ID = 'aim_frontend_demo';

interface AssessmentState {
  assessments: AssessmentView[];
  versions: AssessmentVersionView[];
  validations: Map<string, AssessmentValidationView>;
  defects: DefectView[];
  models: AiModelView[];
  evaluations: Map<string, AiEvaluationView>;
  modelApprovals: Map<string, number>;
  prompts: PromptVersionView[];
  plugins: PluginView[];
}

function freshAssessment(): AssessmentState {
  const validation: AssessmentValidationView = {
    versionId: 'ver_frontend_demo',
    checks: [
      { id: 'chk_rubric', label: 'Rubric completeness', status: 'pass' },
      { id: 'chk_bias', label: 'Adverse-impact review', status: 'pending' },
      { id: 'chk_access', label: 'Accessibility conformance', status: 'pass' },
    ],
    resolved: false,
    outcome: null,
    rationale: null,
  };
  const evaluation: AiEvaluationView = {
    modelId: AI_MODEL_ID,
    dimensions: [
      { id: 'dim_safety', label: 'Safety', status: 'pass' },
      { id: 'dim_bias', label: 'Bias', status: 'pending' },
      { id: 'dim_drift', label: 'Drift', status: 'pass' },
      { id: 'dim_human', label: 'Human impact', status: 'pass' },
    ],
    recorded: false,
    outcome: null,
    rationale: null,
  };
  return {
    assessments: [
      {
        id: ASSESSMENT_ID,
        name: 'Backend Engineer — Applied',
        roleFamily: 'Engineering',
        riskTier: 'high',
        status: 'active',
        owner: 'Assessment Admin',
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'asm_analyst',
        name: 'Data Analyst — Screening',
        roleFamily: 'Analytics',
        riskTier: 'limited',
        status: 'draft',
        owner: 'A. Murphy',
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ],
    versions: [
      {
        id: 'ver_frontend_demo',
        assessmentId: ASSESSMENT_ID,
        label: 'v3',
        status: 'draft',
        effectiveDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        rationale: 'Refresh applied tasks and rubric anchors.',
        validationResolved: false,
      },
      {
        id: 'ver_v2',
        assessmentId: ASSESSMENT_ID,
        label: 'v2',
        status: 'active',
        effectiveDate: new Date(Date.now() - 60 * 86400000).toISOString(),
        rationale: 'Current live version.',
        validationResolved: true,
      },
    ],
    validations: new Map([['ver_frontend_demo', validation]]),
    defects: [
      {
        id: 'dfct_1',
        title: 'Task 3 rubric anchor ambiguous',
        severity: 'medium',
        status: 'open',
        scope: 'ver_frontend_demo · Task 3',
        owner: 'Assessment Admin',
      },
    ],
    models: [
      {
        id: AI_MODEL_ID,
        name: 'assist-summariser-1',
        provider: 'Internal',
        useCase: 'Reviewer note summarisation (advisory only)',
        status: 'in_evaluation',
        limitations: 'No scoring authority; outputs are advisory and human-reviewed.',
      },
    ],
    evaluations: new Map([[AI_MODEL_ID, evaluation]]),
    modelApprovals: new Map([[AI_MODEL_ID, 1]]),
    prompts: [
      {
        id: 'prm_1',
        name: 'reviewer-summary',
        version: 2,
        status: 'active',
        immutable: true,
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
      {
        id: 'prm_1_v1',
        name: 'reviewer-summary',
        version: 1,
        status: 'rolled_back',
        immutable: true,
        createdAt: new Date(Date.now() - 50 * 86400000).toISOString(),
      },
    ],
    plugins: [
      {
        id: 'plg_code',
        name: 'code-runner',
        capabilities: ['execute-sandbox', 'read-artifact'],
        dataScope: 'attempt artifacts only',
        status: 'approved',
      },
      {
        id: 'plg_sheet',
        name: 'spreadsheet',
        capabilities: ['read-artifact'],
        dataScope: 'attempt artifacts only',
        status: 'registered',
      },
    ],
  };
}

let assessment: AssessmentState = freshAssessment();

const MODEL_APPROVALS_REQUIRED = 2;

export const assessmentStore = {
  assessmentId: ASSESSMENT_ID,
  modelId: AI_MODEL_ID,

  getAssessments(): Collection<AssessmentView> {
    return { items: assessment.assessments, total: assessment.assessments.length };
  },
  createAssessment(name: string, roleFamily: string, riskTier: RiskTier): AssessmentView {
    const a: AssessmentView = {
      id: randomId('asm'),
      name,
      roleFamily,
      riskTier,
      status: 'draft',
      owner: 'You',
      updatedAt: new Date().toISOString(),
    };
    assessment.assessments.unshift(a);
    return a;
  },
  getAssessment(id: string): AssessmentDetailView | null {
    const a = assessment.assessments.find((x) => x.id === id);
    if (a === undefined) return null;
    return {
      id: a.id,
      name: a.name,
      status: a.status,
      owner: a.owner,
      reference: `AST-${a.id.slice(-4).toUpperCase()}`,
      riskTier: a.riskTier,
      versions: assessment.versions.filter((v) => v.assessmentId === id),
    };
  },
  setAssessmentStatus(id: string, status: AssessmentStatus): AssessmentDetailView | null {
    const index = assessment.assessments.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const current = assessment.assessments[index];
    if (current === undefined) return null;
    assessment.assessments[index] = { ...current, status };
    return this.getAssessment(id);
  },

  saveVersion(assessmentId: string, label: string, rationale: string): AssessmentVersionView {
    const v: AssessmentVersionView = {
      id: randomId('ver'),
      assessmentId,
      label,
      status: 'draft',
      effectiveDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      rationale,
      validationResolved: false,
    };
    assessment.versions.unshift(v);
    return v;
  },
  setVersionStatus(
    versionId: string,
    status: AssessmentVersionStatus,
  ): AssessmentVersionView | null {
    const index = assessment.versions.findIndex((v) => v.id === versionId);
    if (index === -1) return null;
    const current = assessment.versions[index];
    if (current === undefined) return null;
    // Activation requires that validation has been resolved for this immutable version.
    if (status === 'active' && !current.validationResolved) return current;
    const next: AssessmentVersionView = { ...current, status };
    assessment.versions[index] = next;
    return next;
  },

  getPreview(assessmentId: string): AssessmentPreviewView | null {
    const a = assessment.assessments.find((x) => x.id === assessmentId);
    if (a === undefined) return null;
    return {
      versionId: 'ver_frontend_demo',
      assessmentName: a.name,
      sections: [
        { title: 'Section 1 · Warm-up', tasks: ['Environment check', 'Sample task'] },
        { title: 'Section 2 · Applied task', tasks: ['Task 1', 'Task 2', 'Task 3'] },
        { title: 'Section 3 · Reflection', tasks: ['Written summary'] },
      ],
    };
  },

  getValidation(versionId: string): AssessmentValidationView | null {
    return assessment.validations.get(versionId) ?? null;
  },
  resolveValidation(
    versionId: string,
    outcome: string,
    rationale: string,
  ): AssessmentValidationView | null {
    const current = assessment.validations.get(versionId);
    if (current === undefined) return null;
    const next: AssessmentValidationView = {
      ...current,
      resolved: true,
      outcome,
      rationale,
      checks: current.checks.map((c) => (c.status === 'pending' ? { ...c, status: 'pass' } : c)),
    };
    assessment.validations.set(versionId, next);
    const vIndex = assessment.versions.findIndex((v) => v.id === versionId);
    if (vIndex !== -1) {
      const v = assessment.versions[vIndex];
      if (v !== undefined) {
        assessment.versions[vIndex] = { ...v, validationResolved: true, status: 'validated' };
      }
    }
    return next;
  },

  getDefects(): Collection<DefectView> {
    return { items: assessment.defects, total: assessment.defects.length };
  },
  logDefect(title: string, severity: DefectSeverity, scope: string): DefectView {
    const d: DefectView = {
      id: randomId('dfct'),
      title,
      severity,
      status: 'open',
      scope,
      owner: 'You',
    };
    assessment.defects.unshift(d);
    return d;
  },

  getModels(): Collection<AiModelView> {
    return { items: assessment.models, total: assessment.models.length };
  },
  registerModel(name: string, provider: string, useCase: string, limitations: string): AiModelView {
    const m: AiModelView = {
      id: randomId('aim'),
      name,
      provider,
      useCase,
      status: 'registered',
      limitations,
    };
    assessment.models.unshift(m);
    assessment.modelApprovals.set(m.id, 0);
    return m;
  },
  getModel(id: string): AiModelDetailView | null {
    const m = assessment.models.find((x) => x.id === id);
    if (m === undefined) return null;
    const evaluation = assessment.evaluations.get(id);
    return {
      id: m.id,
      name: m.name,
      provider: m.provider,
      useCase: m.useCase,
      status: m.status,
      limitations: m.limitations,
      reference: `AI-${m.id.slice(-4).toUpperCase()}`,
      evaluationRecorded: evaluation?.recorded ?? false,
      approvals: assessment.modelApprovals.get(id) ?? 0,
      approvalsRequired: MODEL_APPROVALS_REQUIRED,
    };
  },
  setModelStatus(id: string, status: AiModelStatus): AiModelDetailView | null {
    const index = assessment.models.findIndex((m) => m.id === id);
    if (index === -1) return null;
    const current = assessment.models[index];
    if (current === undefined) return null;
    const evaluation = assessment.evaluations.get(id);
    const approvals = assessment.modelApprovals.get(id) ?? 0;
    // Activation requires a recorded evaluation and the required number of human approvals.
    if (
      status === 'active' &&
      (!(evaluation?.recorded ?? false) || approvals < MODEL_APPROVALS_REQUIRED)
    ) {
      return this.getModel(id);
    }
    assessment.models[index] = { ...current, status };
    return this.getModel(id);
  },

  getEvaluation(modelId: string): AiEvaluationView | null {
    return assessment.evaluations.get(modelId) ?? null;
  },
  recordEvaluation(modelId: string, outcome: string, rationale: string): AiEvaluationView | null {
    const current = assessment.evaluations.get(modelId);
    if (current === undefined) return null;
    const next: AiEvaluationView = {
      ...current,
      recorded: true,
      outcome,
      rationale,
      dimensions: current.dimensions.map((d) =>
        d.status === 'pending' ? { ...d, status: 'pass' } : d,
      ),
    };
    assessment.evaluations.set(modelId, next);
    const mIndex = assessment.models.findIndex((m) => m.id === modelId);
    if (mIndex !== -1) {
      const m = assessment.models[mIndex];
      if (m !== undefined) assessment.models[mIndex] = { ...m, status: 'approved' };
    }
    assessment.modelApprovals.set(modelId, MODEL_APPROVALS_REQUIRED);
    return next;
  },

  getPrompts(): Collection<PromptVersionView> {
    return { items: assessment.prompts, total: assessment.prompts.length };
  },
  createPromptVersion(name: string): PromptVersionView {
    const latest = assessment.prompts
      .filter((p) => p.name === name)
      .reduce((max, p) => Math.max(max, p.version), 0);
    const p: PromptVersionView = {
      id: randomId('prm'),
      name,
      version: latest + 1,
      status: 'active',
      immutable: true,
      createdAt: new Date().toISOString(),
    };
    // Immutable prompts: supersede the prior active version rather than mutating it.
    assessment.prompts = assessment.prompts.map((existing) =>
      existing.name === name && existing.status === 'active'
        ? { ...existing, status: 'rolled_back' }
        : existing,
    );
    assessment.prompts.unshift(p);
    return p;
  },

  getPlugins(): Collection<PluginView> {
    return { items: assessment.plugins, total: assessment.plugins.length };
  },
  registerPlugin(name: string, capabilities: readonly string[], dataScope: string): PluginView {
    const p: PluginView = {
      id: randomId('plg'),
      name,
      capabilities,
      dataScope,
      status: 'registered',
    };
    assessment.plugins.unshift(p);
    return p;
  },

  reset(): void {
    assessment = freshAssessment();
  },
};

// ── Governance & Audit store (GOV-01..18, AUD-01..02) ──────────────────────────────────────────
// Invariants: governance decisions require human authority checkpoints with outcome+rationale;
// versioned artifacts are immutable; chain of custody is maintained for evidence collections.

export const AI_SYSTEM_ID = 'ais_frontend_demo';
export const EVIDENCE_COLLECTION_ID = 'evc_frontend_demo';

interface GovernanceState {
  aiSystems: AiSystemView[];
  classifications: Map<string, ClassificationView>;
  risks: RiskView[];
  datasets: DatasetView[];
  technicalDocs: TechnicalDocView[];
  qmsProcedures: QmsProcedureView[];
  dataUse: DataUseView[];
  impactAssessments: Map<string, ImpactAssessmentView>;
  oversightPlans: Map<string, OversightPlanView>;
  deployerInstructions: DeployerInstructionsView[];
  aiLiteracy: AiLiteracyView[];
  conformityAssessments: Map<string, ConformityAssessmentView>;
  marketAccess: MarketAccessView[];
  postMarketPlans: Map<string, PostMarketPlanView>;
  signals: SignalView[];
  incidents: SeriousIncidentView[];
  vendors: VendorEvidenceView[];
  changes: ChangeRequestView[];
  evidenceCollections: EvidenceCollectionView[];
  traceability: TraceabilityView[];
}

function freshGovernance(): GovernanceState {
  const classification: ClassificationView = {
    systemId: AI_SYSTEM_ID,
    role: 'Provider',
    intendedPurpose: 'Employment candidate assessment',
    classification: null,
    reasoning: null,
    resolved: false,
  };
  const impactAssessment: ImpactAssessmentView = {
    systemId: AI_SYSTEM_ID,
    assessmentType: 'DPIA',
    outcome: null,
    rationale: null,
    resolved: false,
  };
  const oversightPlan: OversightPlanView = {
    systemId: AI_SYSTEM_ID,
    authority: null,
    competency: null,
    stoppingRules: null,
    outcome: null,
    rationale: null,
    resolved: false,
  };
  const conformityAssessment: ConformityAssessmentView = {
    systemId: AI_SYSTEM_ID,
    requirements: 'EU AI Act, ISO 42001',
    tests: 'Validation suite, bias testing',
    gaps: 'Pending final oversight approval',
    outcome: null,
    rationale: null,
    resolved: false,
  };
  const postMarketPlan: PostMarketPlanView = {
    systemId: AI_SYSTEM_ID,
    metrics: 'Accuracy, bias metrics, user feedback',
    thresholds: '95% accuracy, <5% bias',
    reviewCadence: 'Quarterly',
    outcome: null,
    rationale: null,
    resolved: false,
  };
  return {
    aiSystems: [
      {
        id: AI_SYSTEM_ID,
        name: 'CPF Assessment Platform',
        purpose: 'Employment candidate assessment',
        classification: 'High-risk (AI Act Article 6)',
        status: 'ready',
        owner: 'AI Governance',
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: 'ais_secondary',
        name: 'Reviewer Note Summarizer',
        purpose: 'Advisory summarization only',
        classification: 'Limited-risk',
        status: 'complete',
        owner: 'AI Governance',
        updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ],
    classifications: new Map([[AI_SYSTEM_ID, classification]]),
    risks: [
      {
        id: randomId('rsk'),
        title: 'Bias in candidate scoring',
        riskLevel: 'high',
        controls: 'Diverse training data, bias testing, human oversight',
        residual: 'Medium',
        status: 'ready',
        owner: 'Risk Owner',
      },
      {
        id: randomId('rsk'),
        title: 'Data breach',
        riskLevel: 'critical',
        controls: 'Encryption, access controls, audit logging',
        residual: 'Low',
        status: 'complete',
        owner: 'CISO',
      },
    ],
    datasets: [
      {
        id: randomId('dst'),
        name: 'Training Corpus 2026-Q1',
        provenance: 'Synthetically generated, validated',
        lawfulBasis: 'Legitimate interest (employment)',
        representativeness: 'Age, gender, region balanced',
        status: 'complete',
        owner: 'Data Steward',
        updatedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
    ],
    technicalDocs: [
      {
        id: randomId('tdc'),
        systemId: AI_SYSTEM_ID,
        version: 'v2.0',
        status: 'ready',
        owner: 'Compliance',
        reference: `TDC-${randomId('ref').slice(-4).toUpperCase()}`,
        updatedAt: new Date().toISOString(),
      },
    ],
    qmsProcedures: [
      {
        id: randomId('qms'),
        title: 'Assessment Version Approval',
        policy: 'All versions require human validation before activation',
        approvedBy: 'Compliance',
        status: 'complete',
        owner: 'Compliance',
        updatedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
    ],
    dataUse: [
      {
        id: randomId('dup'),
        purpose: 'Employment candidate assessment',
        lawfulBasis: 'Legitimate interest',
        categories: 'Candidate responses, metadata',
        recipients: 'Employer, assessment reviewers',
        retention: '3 years post-decision',
        status: 'ready',
        owner: 'DPO',
      },
    ],
    impactAssessments: new Map([[AI_SYSTEM_ID, impactAssessment]]),
    oversightPlans: new Map([[AI_SYSTEM_ID, oversightPlan]]),
    deployerInstructions: [
      {
        id: randomId('dpi'),
        systemId: AI_SYSTEM_ID,
        version: 'v1.2',
        limitations: 'No automated decisions; human oversight required',
        oversight: 'Authorised reviewer must approve all outcomes',
        status: 'ready',
        owner: 'Compliance',
        reference: `DPI-${randomId('ref').slice(-4).toUpperCase()}`,
      },
    ],
    aiLiteracy: [
      {
        id: randomId('lit'),
        role: 'Reviewer',
        trainingModule: 'AI Governance Essentials',
        assignee: 'A. Murphy',
        completedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        expiresAt: new Date(Date.now() + 335 * 86400000).toISOString(),
        status: 'complete',
      },
      {
        id: randomId('lit'),
        role: 'Employer Admin',
        trainingModule: 'AI Governance Essentials',
        assignee: 'J. Patel',
        completedAt: null,
        expiresAt: null,
        status: 'attention',
      },
    ],
    conformityAssessments: new Map([[AI_SYSTEM_ID, conformityAssessment]]),
    marketAccess: [
      {
        id: randomId('mka'),
        systemId: AI_SYSTEM_ID,
        accessType: 'declaration',
        completedAt: null,
        evidence: 'Pending final conformity approval',
        status: 'draft',
        owner: 'Compliance',
      },
    ],
    postMarketPlans: new Map([[AI_SYSTEM_ID, postMarketPlan]]),
    signals: [
      {
        id: randomId('sig'),
        type: 'bias',
        priority: 'high',
        description: 'Adverse impact detected in age cohort',
        status: 'attention',
        owner: 'AI Governance',
        detectedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
      {
        id: randomId('sig'),
        type: 'drift',
        priority: 'medium',
        description: 'Model accuracy degradation',
        status: 'ready',
        owner: 'Operations',
        detectedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
      },
    ],
    incidents: [
      {
        id: randomId('inc'),
        title: 'Incorrect decision issued',
        severity: 'serious',
        contained: true,
        notified: true,
        status: 'complete',
        owner: 'Incident Manager',
        occurredAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ],
    vendors: [
      {
        id: randomId('vnd'),
        vendor: 'AI Model Provider',
        obligation: 'Annual safety certification',
        evidence: 'Certificate valid through 2027-03-01',
        expiresAt: new Date(Date.now() + 180 * 86400000).toISOString(),
        status: 'ready',
        owner: 'Vendor Manager',
      },
    ],
    changes: [
      {
        id: randomId('chg'),
        title: 'Update assessment rubric',
        significance: 'major',
        affectedControls: 'Bias testing, reviewer training',
        outcome: null,
        rationale: null,
        resolved: false,
        status: 'draft',
        owner: 'Change Authority',
      },
    ],
    evidenceCollections: [
      {
        id: EVIDENCE_COLLECTION_ID,
        title: 'Q1 2026 Conformity Evidence',
        purpose: 'EU AI Act conformity assessment',
        custodian: 'Compliance',
        sealed: false,
        chainOfCustody: [
          {
            actor: 'Compliance',
            action: 'Created collection',
            timestamp: new Date(Date.now() - 15 * 86400000).toISOString(),
          },
          {
            actor: 'Auditor',
            action: 'Added evidence',
            timestamp: new Date(Date.now() - 10 * 86400000).toISOString(),
          },
        ],
        status: 'ready',
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
    ],
    traceability: [
      {
        requirementId: 'FR-GOV-08',
        description: 'Deployer instructions',
        controls: ['Human oversight plan', 'Training requirements'],
        surfaces: ['GOV-10', 'GOV-09', 'GOV-11'],
        endpoints: ['/governance/deployer-instructions', '/governance/oversight'],
        evidence: ['Technical documentation v2.0', 'Training records'],
      },
      {
        requirementId: 'FR-AUD-01',
        description: 'Evidence retention',
        controls: ['Chain of custody', 'Immutable collections'],
        surfaces: ['AUD-01'],
        endpoints: ['/audit/evidence-collections'],
        evidence: ['Q1 2026 Conformity Evidence'],
      },
    ],
  };
}

let governance: GovernanceState = freshGovernance();

export const governanceStore = {
  aiSystemId: AI_SYSTEM_ID,
  evidenceCollectionId: EVIDENCE_COLLECTION_ID,

  // GOV-01: AI Systems
  getAiSystems(): Collection<AiSystemView> {
    return { items: governance.aiSystems, total: governance.aiSystems.length };
  },
  registerAiSystem(name: string, purpose: string, classification: string): AiSystemView {
    const sys: AiSystemView = {
      id: randomId('ais'),
      name,
      purpose,
      classification,
      status: 'draft',
      owner: 'You',
      updatedAt: new Date().toISOString(),
    };
    governance.aiSystems.unshift(sys);
    return sys;
  },

  // GOV-02: AI Act Classification
  getClassification(systemId: string): ClassificationView | null {
    return governance.classifications.get(systemId) ?? null;
  },
  recordClassification(
    systemId: string,
    role: string,
    intendedPurpose: string,
    classification: string,
    reasoning: string,
  ): ClassificationView {
    const c: ClassificationView = {
      systemId,
      role,
      intendedPurpose,
      classification,
      reasoning,
      resolved: true,
    };
    governance.classifications.set(systemId, c);
    return c;
  },

  // GOV-03: Risks
  getRisks(): Collection<RiskView> {
    return { items: governance.risks, total: governance.risks.length };
  },
  updateRisk(
    title: string,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    controls: string,
    residual: string,
  ): RiskView {
    const r: RiskView = {
      id: randomId('rsk'),
      title,
      riskLevel,
      controls,
      residual,
      status: 'draft',
      owner: 'You',
    };
    governance.risks.unshift(r);
    return r;
  },

  // GOV-04: Datasets
  getDatasets(): Collection<DatasetView> {
    return { items: governance.datasets, total: governance.datasets.length };
  },
  registerDataset(
    name: string,
    provenance: string,
    lawfulBasis: string,
    representativeness: string,
  ): DatasetView {
    const d: DatasetView = {
      id: randomId('dst'),
      name,
      provenance,
      lawfulBasis,
      representativeness,
      status: 'draft',
      owner: 'You',
      updatedAt: new Date().toISOString(),
    };
    governance.datasets.unshift(d);
    return d;
  },

  // GOV-05: Technical Documentation
  getTechnicalDocs(): Collection<TechnicalDocView> {
    return { items: governance.technicalDocs, total: governance.technicalDocs.length };
  },
  createTechnicalDocVersion(systemId: string, version: string): TechnicalDocView {
    const doc: TechnicalDocView = {
      id: randomId('tdc'),
      systemId,
      version,
      status: 'draft',
      owner: 'You',
      reference: `TDC-${randomId('ref').slice(-4).toUpperCase()}`,
      updatedAt: new Date().toISOString(),
    };
    governance.technicalDocs.unshift(doc);
    return doc;
  },

  // GOV-06: QMS Procedures
  getQmsProcedures(): Collection<QmsProcedureView> {
    return { items: governance.qmsProcedures, total: governance.qmsProcedures.length };
  },
  addQmsProcedure(title: string, policy: string): QmsProcedureView {
    const proc: QmsProcedureView = {
      id: randomId('qms'),
      title,
      policy,
      approvedBy: null,
      status: 'draft',
      owner: 'You',
      updatedAt: new Date().toISOString(),
    };
    governance.qmsProcedures.unshift(proc);
    return proc;
  },

  // GOV-07: Data Use
  getDataUse(): Collection<DataUseView> {
    return { items: governance.dataUse, total: governance.dataUse.length };
  },
  addDataUsePurpose(
    purpose: string,
    lawfulBasis: string,
    categories: string,
    recipients: string,
    retention: string,
  ): DataUseView {
    const du: DataUseView = {
      id: randomId('dup'),
      purpose,
      lawfulBasis,
      categories,
      recipients,
      retention,
      status: 'draft',
      owner: 'You',
    };
    governance.dataUse.unshift(du);
    return du;
  },

  // GOV-08: Impact Assessment
  getImpactAssessment(systemId: string): ImpactAssessmentView | null {
    return governance.impactAssessments.get(systemId) ?? null;
  },
  recordImpactAssessment(
    systemId: string,
    assessmentType: 'DPIA' | 'FundamentalRights',
    outcome: string,
    rationale: string,
  ): ImpactAssessmentView {
    const ia: ImpactAssessmentView = {
      systemId,
      assessmentType,
      outcome,
      rationale,
      resolved: true,
    };
    governance.impactAssessments.set(systemId, ia);
    return ia;
  },

  // GOV-09: Oversight Plan
  getOversightPlan(systemId: string): OversightPlanView | null {
    return governance.oversightPlans.get(systemId) ?? null;
  },
  approveOversightPlan(
    systemId: string,
    authority: string,
    competency: string,
    stoppingRules: string,
    outcome: string,
    rationale: string,
  ): OversightPlanView {
    const op: OversightPlanView = {
      systemId,
      authority,
      competency,
      stoppingRules,
      outcome,
      rationale,
      resolved: true,
    };
    governance.oversightPlans.set(systemId, op);
    return op;
  },

  // GOV-10: Deployer Instructions
  getDeployerInstructions(): Collection<DeployerInstructionsView> {
    return {
      items: governance.deployerInstructions,
      total: governance.deployerInstructions.length,
    };
  },
  publishDeployerInstructions(
    systemId: string,
    version: string,
    limitations: string,
    oversight: string,
  ): DeployerInstructionsView {
    const dpi: DeployerInstructionsView = {
      id: randomId('dpi'),
      systemId,
      version,
      limitations,
      oversight,
      status: 'draft',
      owner: 'You',
      reference: `DPI-${randomId('ref').slice(-4).toUpperCase()}`,
    };
    governance.deployerInstructions.unshift(dpi);
    return dpi;
  },

  // GOV-11: AI Literacy
  getAiLiteracy(): Collection<AiLiteracyView> {
    return { items: governance.aiLiteracy, total: governance.aiLiteracy.length };
  },
  assignTraining(role: string, trainingModule: string, assignee: string): AiLiteracyView {
    const lit: AiLiteracyView = {
      id: randomId('lit'),
      role,
      trainingModule,
      assignee,
      completedAt: null,
      expiresAt: null,
      status: 'attention',
    };
    governance.aiLiteracy.unshift(lit);
    return lit;
  },

  // GOV-12: Conformity Assessment
  getConformityAssessment(systemId: string): ConformityAssessmentView | null {
    return governance.conformityAssessments.get(systemId) ?? null;
  },
  submitConformityAssessment(
    systemId: string,
    requirements: string,
    tests: string,
    gaps: string,
    outcome: string,
    rationale: string,
  ): ConformityAssessmentView {
    const ca: ConformityAssessmentView = {
      systemId,
      requirements,
      tests,
      gaps,
      outcome,
      rationale,
      resolved: true,
    };
    governance.conformityAssessments.set(systemId, ca);
    return ca;
  },

  // GOV-13: Market Access
  getMarketAccess(): Collection<MarketAccessView> {
    return { items: governance.marketAccess, total: governance.marketAccess.length };
  },
  recordMarketAccess(
    systemId: string,
    accessType: MarketAccessType,
    evidence: string,
  ): MarketAccessView {
    const ma: MarketAccessView = {
      id: randomId('mka'),
      systemId,
      accessType,
      completedAt: new Date().toISOString(),
      evidence,
      status: 'complete',
      owner: 'You',
    };
    governance.marketAccess.unshift(ma);
    return ma;
  },

  // GOV-14: Post-Market Plan
  getPostMarketPlan(systemId: string): PostMarketPlanView | null {
    return governance.postMarketPlans.get(systemId) ?? null;
  },
  approvePostMarketPlan(
    systemId: string,
    metrics: string,
    thresholds: string,
    reviewCadence: string,
    outcome: string,
    rationale: string,
  ): PostMarketPlanView {
    const pmp: PostMarketPlanView = {
      systemId,
      metrics,
      thresholds,
      reviewCadence,
      outcome,
      rationale,
      resolved: true,
    };
    governance.postMarketPlans.set(systemId, pmp);
    return pmp;
  },

  // GOV-15: Signals Dashboard
  getSignalsDashboard(): SignalDashboardView {
    const ready = governance.signals.filter((s) => s.status === 'ready').length;
    const attention = governance.signals.filter((s) => s.status === 'attention').length;
    const inProgress = governance.signals.filter((s) => s.status === 'draft').length;
    return {
      readyNow: ready,
      needsAttention: attention,
      inProgress,
      signals: governance.signals,
      recentActivity: [
        { event: 'Evidence version recorded', timestamp: '1h ago' },
        { event: 'Human review submitted', timestamp: '2h ago' },
      ],
    };
  },
  createSignal(type: SignalType, priority: SignalPriority, description: string): SignalView {
    const sig: SignalView = {
      id: randomId('sig'),
      type,
      priority,
      description,
      status: 'attention',
      owner: 'You',
      detectedAt: new Date().toISOString(),
    };
    governance.signals.unshift(sig);
    return sig;
  },

  // GOV-16: Serious Incidents
  getIncidents(): Collection<SeriousIncidentView> {
    return { items: governance.incidents, total: governance.incidents.length };
  },
  escalateIncident(
    title: string,
    severity: IncidentSeverity,
    contained: boolean,
    notified: boolean,
  ): SeriousIncidentView {
    const inc: SeriousIncidentView = {
      id: randomId('inc'),
      title,
      severity,
      contained,
      notified,
      status: 'draft',
      owner: 'You',
      occurredAt: new Date().toISOString(),
    };
    governance.incidents.unshift(inc);
    return inc;
  },

  // GOV-17: Vendor Evidence
  getVendorEvidence(): Collection<VendorEvidenceView> {
    return { items: governance.vendors, total: governance.vendors.length };
  },
  requestVendorEvidence(vendor: string, obligation: string): VendorEvidenceView {
    const ve: VendorEvidenceView = {
      id: randomId('vnd'),
      vendor,
      obligation,
      evidence: null,
      expiresAt: null,
      status: 'attention',
      owner: 'You',
    };
    governance.vendors.unshift(ve);
    return ve;
  },

  // GOV-18: Change Requests
  getChangeRequests(): Collection<ChangeRequestView> {
    return { items: governance.changes, total: governance.changes.length };
  },
  submitChangeRequest(
    title: string,
    significance: 'minor' | 'major' | 'substantial',
    affectedControls: string,
  ): ChangeRequestView {
    const cr: ChangeRequestView = {
      id: randomId('chg'),
      title,
      significance,
      affectedControls,
      outcome: null,
      rationale: null,
      resolved: false,
      status: 'draft',
      owner: 'You',
    };
    governance.changes.unshift(cr);
    return cr;
  },
  recordChangeDecision(id: string, outcome: string, rationale: string): ChangeRequestView | null {
    const index = governance.changes.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const current = governance.changes[index];
    if (current === undefined) return null;
    governance.changes[index] = { ...current, outcome, rationale, resolved: true };
    return governance.changes[index] ?? null;
  },

  // AUD-01: Evidence Collections
  getEvidenceCollections(): Collection<EvidenceCollectionView> {
    return {
      items: governance.evidenceCollections,
      total: governance.evidenceCollections.length,
    };
  },
  createEvidenceCollection(title: string, purpose: string): EvidenceCollectionView {
    const ec: EvidenceCollectionView = {
      id: randomId('evc'),
      title,
      purpose,
      custodian: 'You',
      sealed: false,
      chainOfCustody: [
        {
          actor: 'You',
          action: 'Created collection',
          timestamp: new Date().toISOString(),
        },
      ],
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    governance.evidenceCollections.unshift(ec);
    return ec;
  },

  // AUD-02: Traceability
  getTraceability(): Collection<TraceabilityView> {
    return { items: governance.traceability, total: governance.traceability.length };
  },

  reset(): void {
    governance = freshGovernance();
  },
};

// ===== ACCOUNT STORE (ACC-02) =====

interface NotificationPref {
  id: string;
  channel: 'email' | 'in_app' | 'sms';
  category: string;
  enabled: boolean;
  mandatory: boolean;
}

const notificationPrefs: NotificationPref[] = [
  {
    id: '1',
    channel: 'email',
    category: 'Application status',
    enabled: true,
    mandatory: true,
  },
  { id: '2', channel: 'email', category: 'Assessment invitations', enabled: true, mandatory: true },
  { id: '3', channel: 'email', category: 'Support responses', enabled: true, mandatory: false },
  { id: '4', channel: 'in_app', category: 'Application status', enabled: true, mandatory: false },
  { id: '5', channel: 'in_app', category: 'System notices', enabled: true, mandatory: false },
  { id: '6', channel: 'sms', category: 'Assessment invitations', enabled: false, mandatory: false },
  { id: '7', channel: 'sms', category: 'Critical alerts', enabled: true, mandatory: true },
];

export const accountStore = {
  async getNotificationPreferences() {
    return { items: notificationPrefs, total: notificationPrefs.length };
  },
  async updateNotificationPreferences(
    updates: Array<{ channel: string; category: string; enabled: boolean }>,
  ) {
    updates.forEach((update) => {
      const pref = notificationPrefs.find(
        (p) => p.channel === update.channel && p.category === update.category,
      );
      if (pref && !pref.mandatory) {
        pref.enabled = update.enabled;
      }
    });
  },
};

// ===== SUPPORT STORE =====

export const supportStore = {
  async getSupportQueue() {
    const cases = [
      {
        id: '1',
        ticketNumber: 'SUP-2458',
        subject: 'Cannot access assessment - timeout error',
        requester: 'jordan.smith@example.com',
        priority: 'high' as const,
        status: 'new' as const,
        category: 'Technical',
        age: '2h',
      },
      {
        id: '2',
        ticketNumber: 'SUP-2457',
        subject: 'Request profile data correction',
        requester: 'alex.chen@example.com',
        priority: 'medium' as const,
        status: 'assigned' as const,
        category: 'Account',
        age: '5h',
        assignedTo: 'Sarah Johnson',
      },
      {
        id: '3',
        ticketNumber: 'SUP-2456',
        subject: 'Webcam not detected during system check',
        requester: 'morgan.taylor@example.com',
        priority: 'medium' as const,
        status: 'in_progress' as const,
        category: 'Technical',
        age: '1d',
        assignedTo: 'Michael Brown',
      },
    ];
    return { items: cases, total: cases.length };
  },
  async getSupportCase(id: string) {
    return {
      id,
      ticketNumber: 'SUP-2458',
      subject: 'Cannot access assessment - timeout error',
      description:
        'I clicked the assessment link from my email but it keeps timing out. I have tried on Chrome and Firefox.',
      requester: 'jordan.smith@example.com',
      priority: 'high' as const,
      status: 'new' as const,
      category: 'Technical',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      messages: [
        {
          id: '1',
          author: 'Jordan Smith',
          content:
            'I clicked the assessment link from my email but it keeps timing out. I have tried on Chrome and Firefox.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          internal: false,
        },
      ],
    };
  },
  async addSupportMessage(caseId: string, content: string, internal: boolean) {
    console.log(`Message added to case ${caseId} (internal: ${internal}): ${content}`);
  },
  async updateSupportCaseStatus(caseId: string, status: string) {
    console.log(`Case ${caseId} status updated to: ${status}`);
  },
  async getJitAccessSessions() {
    return {
      sessions: [
        {
          id: '1',
          grantedTo: 'sarah.johnson@cpf.internal',
          scope: 'candidate_data',
          justification: 'Need to review candidate data to resolve support ticket SUP-2457',
          grantedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          status: 'active' as const,
          actions: [
            {
              id: '1',
              action: 'Viewed candidate profile',
              timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
              outcome: 'Success',
            },
          ],
        },
      ],
    };
  },
  async requestJitAccess(scope: string, justification: string) {
    console.log(`JIT access requested for ${scope}: ${justification}`);
  },
  async revokeJitAccess(sessionId: string) {
    console.log(`JIT access revoked for session ${sessionId}`);
  },
};

// ===== OPERATIONS STORE =====

export const operationsStore = {
  async getOperationsDashboard() {
    return {
      metrics: [
        { label: 'Active assessments', value: '247', trend: '+12%', tone: 'sage' as const },
        { label: 'System uptime', value: '99.8%', tone: 'sage' as const },
        { label: 'Avg response time', value: '142ms', trend: '+8ms', tone: 'amber' as const },
        { label: 'Error rate', value: '0.12%', trend: '-0.03%', tone: 'sage' as const },
        { label: 'Support queue', value: '23', trend: '+5', tone: 'amber' as const },
        { label: 'AI model accuracy', value: '94.2%', trend: '+1.1%', tone: 'sage' as const },
      ],
      alerts: [
        {
          id: '1',
          severity: 'warning' as const,
          message: 'Database query performance degraded - average latency 320ms (threshold 250ms)',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          acknowledged: false,
        },
      ],
      recentActivity: [
        {
          id: '1',
          description: 'AI model "screening-v3" promoted to production',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          description: 'Change request CR-1247 approved by QMS',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          description: '156 candidates completed assessments',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
      ],
    };
  },
  async acknowledgeOperationalAlert(alertId: string) {
    console.log(`Alert ${alertId} acknowledged`);
  },
  async getSecurityStatus() {
    return {
      incidents: [],
      killSwitch: {
        enabled: false,
      },
    };
  },
  async activateKillSwitch(reason: string) {
    console.log(`Kill switch activated: ${reason}`);
  },
  async deactivateKillSwitch() {
    console.log('Kill switch deactivated');
  },
  async escalateSecurityIncident(incidentId: string) {
    console.log(`Security incident ${incidentId} escalated`);
  },
  async getIntegrationDeliveries() {
    const deliveries = [
      {
        id: '1',
        deliveryType: 'export' as const,
        destination: 'SFTP://hr.client.com/exports',
        status: 'delivered' as const,
        recordCount: 45,
        initiatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        retryCount: 0,
      },
      {
        id: '2',
        deliveryType: 'webhook' as const,
        destination: 'https://api.client.com/webhooks/assessment-complete',
        status: 'failed' as const,
        recordCount: 12,
        initiatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        errorMessage: 'Connection timeout after 30s',
        retryCount: 2,
      },
      {
        id: '3',
        deliveryType: 'api' as const,
        destination: 'https://ats.company.com/api/v2/applications',
        status: 'in_progress' as const,
        recordCount: 23,
        initiatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        retryCount: 0,
      },
    ];
    return { items: deliveries, total: deliveries.length };
  },
  async retryIntegrationDelivery(deliveryId: string) {
    console.log(`Retrying integration delivery ${deliveryId}`);
  },
};
