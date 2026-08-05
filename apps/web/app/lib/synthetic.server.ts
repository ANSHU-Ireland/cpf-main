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
