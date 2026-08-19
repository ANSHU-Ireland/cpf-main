import type {
  AccommodationStatus,
  AccommodationView,
  CheckStatus,
  Collection,
  Notice,
  PracticeModule,
  ReviewableDecision,
  ScheduleSlotView,
  SupportTicket,
  SystemCheck,
} from './types';
import type { PlatformCandidateProfile } from './candidate-api.server';

export interface PlatformAccommodation {
  readonly id: string;
  readonly requestSummary: string;
  readonly operationalAdjustments: Readonly<Record<string, unknown>>;
  readonly status: string;
  readonly createdAt: string;
}

export interface PlatformNoticeAcknowledgement {
  readonly noticeType: string;
  readonly noticeVersion: string;
}

export interface PlatformSupportCase {
  readonly id: string;
  readonly category: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly subject: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PlatformPracticeModule {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly durationSeconds: number;
  readonly taskCount: number;
}

export interface PlatformPrecheck {
  readonly attemptId: string;
  readonly passed: boolean;
  readonly checks: Readonly<Record<string, boolean>>;
}

export interface PlatformBooking {
  readonly id: string;
  readonly applicationId: string;
  readonly status: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly candidateTimezone: string;
}

export const REQUIRED_NOTICES: readonly (Notice & {
  readonly noticeType: string;
  readonly noticeVersion: string;
})[] = [
  {
    id: '11111111-0000-4000-8000-000000000401',
    noticeType: 'privacy',
    noticeVersion: 'demo-1',
    title: 'Data processing and your rights',
    category: 'Privacy & data',
    content:
      '<p>This demonstration records assessment and application evidence for the stated hiring purpose.</p><p>You can request access, correction, restriction or deletion through the data-rights area. Final employment decisions remain with authorised humans.</p>',
    acknowledged: false,
  },
  {
    id: '11111111-0000-4000-8000-000000000402',
    noticeType: 'monitoring',
    noticeVersion: 'demo-1',
    title: 'Assessment monitoring notice',
    category: 'Monitoring',
    content:
      '<p>The controlled assessment may collect explicitly disclosed technical and integrity events.</p><p>Signals do not determine an outcome automatically and require authorised human review.</p>',
    acknowledged: false,
  },
  {
    id: '11111111-0000-4000-8000-000000000403',
    noticeType: 'ai_use',
    noticeVersion: 'demo-1',
    title: 'AI assistance and human decisions',
    category: 'AI & decisions',
    content:
      '<p>Approved AI assistance may be available during an assessment and is recorded with provenance.</p><p>AI output is not a score, rank, recommendation or final decision.</p>',
    acknowledged: false,
  },
];

function accommodationStatus(status: string): AccommodationStatus {
  if (status === 'under_review') return 'in_review';
  if (status === 'approved' || status === 'partially_approved' || status === 'applied') {
    return 'approved';
  }
  if (status === 'declined' || status === 'closed') return 'declined';
  return 'requested';
}

export function candidateAccommodations(input: {
  readonly items: readonly PlatformAccommodation[];
  readonly total: number;
}): Collection<AccommodationView> {
  const items = input.items.map((item) => ({
    id: item.id,
    category:
      typeof item.operationalAdjustments.category === 'string'
        ? item.operationalAdjustments.category
        : 'Adjustment request',
    summary: item.requestSummary,
    status: accommodationStatus(item.status),
    submittedAt: item.createdAt,
    adjustment:
      typeof item.operationalAdjustments.summary === 'string'
        ? item.operationalAdjustments.summary
        : null,
  }));
  return { items, total: input.total };
}

export function candidateNotices(input: {
  readonly items: readonly PlatformNoticeAcknowledgement[];
}): { notices: Notice[]; allAcknowledged: boolean } {
  const acknowledged = new Set(
    input.items.map((item) => `${item.noticeType}:${item.noticeVersion}`),
  );
  const notices = REQUIRED_NOTICES.map((notice) => ({
    id: notice.id,
    title: notice.title,
    content: notice.content,
    category: notice.category,
    acknowledged: acknowledged.has(`${notice.noticeType}:${notice.noticeVersion}`),
  }));
  return { notices, allAcknowledged: notices.every((notice) => notice.acknowledged) };
}

export function candidatePractice(input: { readonly modules: readonly PlatformPracticeModule[] }): {
  modules: PracticeModule[];
} {
  return {
    modules: input.modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      duration: String(Math.ceil(module.durationSeconds / 60)),
      taskCount: module.taskCount,
      completed: false,
    })),
  };
}

export function candidateReviewableDecisions(profile: PlatformCandidateProfile): {
  decisions: ReviewableDecision[];
} {
  return {
    decisions: profile.applications.flatMap((application) =>
      application.decision === null
        ? []
        : [
            {
              id: application.applicationId,
              decisionType: 'Application progression',
              outcome: application.decision.outcome,
              reasoning: application.decision.rationale,
              decidedAt: application.decision.issuedAt,
              canRequest: true,
              reviewRequested: false,
            },
          ],
    ),
  };
}

function supportStatus(status: string): SupportTicket['status'] {
  if (status === 'resolved') return 'resolved';
  if (status === 'closed') return 'closed';
  if (status === 'open' || status === 'draft') return 'open';
  return 'in_progress';
}

export function candidateSupportCases(input: {
  readonly items: readonly PlatformSupportCase[];
  readonly total: number;
}): Collection<SupportTicket> {
  const items = input.items.map((item) => ({
    id: item.id,
    subject: item.subject,
    category: item.category,
    status: supportStatus(item.status),
    priority: item.severity === 'critical' ? ('high' as const) : item.severity,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
  return { items, total: input.total };
}

const PRECHECK_LABELS: Readonly<Record<string, { name: string; description: string }>> = {
  authenticatedSession: {
    name: 'Authenticated session',
    description: 'Confirms that the platform session can access this attempt.',
  },
  platformApi: {
    name: 'Platform connection',
    description: 'Confirms that the assessment API is reachable.',
  },
  desktopCompanion: {
    name: 'Desktop companion',
    description: 'Confirms that the approved signed companion is available.',
  },
};

export function candidatePrecheck(precheck: PlatformPrecheck): {
  checks: SystemCheck[];
  overallStatus: CheckStatus;
} {
  const checks = Object.entries(precheck.checks).map(([id, passed]) => ({
    id,
    name: PRECHECK_LABELS[id]?.name ?? id,
    description: PRECHECK_LABELS[id]?.description ?? 'Controlled environment readiness check.',
    status: passed ? ('passed' as const) : ('failed' as const),
    message: passed ? 'Check passed.' : 'This required check is not available.',
    required: true,
  }));
  return { checks, overallStatus: precheck.passed ? 'passed' : 'failed' };
}

export function candidateSchedule(
  profile: PlatformCandidateProfile,
  bookings: readonly PlatformBooking[],
): Collection<ScheduleSlotView> {
  const titleByApplication = new Map(
    profile.applications.map((application) => [
      application.applicationId,
      application.assessmentTitle,
    ]),
  );
  const items = bookings.map((booking) => ({
    id: booking.id,
    assessmentTitle: titleByApplication.get(booking.applicationId) ?? 'Assessment booking',
    startsAt: booking.startAt,
    endsAt: booking.endAt,
    timezone: booking.candidateTimezone,
    mode: 'remote' as const,
    selected: !['cancelled', 'expired'].includes(booking.status),
  }));
  return { items, total: items.length };
}
