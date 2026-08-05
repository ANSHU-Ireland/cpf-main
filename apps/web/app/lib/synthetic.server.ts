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
