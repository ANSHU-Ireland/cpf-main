import { describe, expect, it } from 'vitest';
import {
  candidateAccommodations,
  candidateNotices,
  candidatePractice,
  candidatePrecheck,
  candidateReviewableDecisions,
  candidateSchedule,
  candidateSupportCases,
  REQUIRED_NOTICES,
} from './candidate-self-service.server.js';

describe('candidate self-service projections', () => {
  it('minimises accommodation details to the candidate view', () => {
    expect(
      candidateAccommodations({
        total: 1,
        items: [
          {
            id: 'a1',
            requestSummary: 'Need more time',
            operationalAdjustments: { category: 'Extra time', summary: '25% extra time' },
            status: 'applied',
            createdAt: '2026-08-16T10:00:00Z',
          },
        ],
      }).items[0],
    ).toEqual(
      expect.objectContaining({
        category: 'Extra time',
        status: 'approved',
        adjustment: '25% extra time',
      }),
    );
  });

  it('calculates required notice completion from persisted version acknowledgements', () => {
    const result = candidateNotices({
      items: REQUIRED_NOTICES.map((notice) => ({
        noticeType: notice.noticeType,
        noticeVersion: notice.noticeVersion,
      })),
    });
    expect(result.allAcknowledged).toBe(true);
    expect(result.notices.every((notice) => notice.acknowledged)).toBe(true);
  });

  it('projects database practice modules and precheck failures', () => {
    expect(
      candidatePractice({
        modules: [
          {
            id: 'p1',
            title: 'Practice',
            description: 'Orientation',
            durationSeconds: 601,
            taskCount: 2,
          },
        ],
      }).modules[0],
    ).toMatchObject({ duration: '11', completed: false });
    expect(
      candidatePrecheck({
        attemptId: 'a1',
        passed: false,
        checks: { platformApi: true, desktopCompanion: false },
      }),
    ).toMatchObject({ overallStatus: 'failed' });
  });

  it('uses application ids as candidate-owned human-review targets', () => {
    const result = candidateReviewableDecisions({
      candidateId: 'candidate-1',
      email: 'candidate@example.test',
      displayName: 'Candidate',
      applications: [
        {
          applicationId: 'application-1',
          employerName: 'Employer',
          roleName: 'Role',
          assessmentTitle: 'Assessment',
          status: 'not_progressed',
          appliedAt: '2026-08-01T00:00:00Z',
          invitedAt: null,
          dueAt: null,
          decision: {
            outcome: 'not_progress',
            rationale: 'Human-authored rationale',
            decidedBy: 'Decision owner',
            issuedAt: '2026-08-16T10:00:00Z',
          },
        },
      ],
    });
    expect(result.decisions[0]).toMatchObject({ id: 'application-1', canRequest: true });
  });

  it('maps persisted bookings and support cases without fabricated records', () => {
    const profile = {
      candidateId: 'candidate-1',
      email: 'candidate@example.test',
      displayName: 'Candidate',
      applications: [
        {
          applicationId: 'application-1',
          employerName: 'Employer',
          roleName: 'Role',
          assessmentTitle: 'Assessment',
          status: 'invited',
          appliedAt: '2026-08-01T00:00:00Z',
          invitedAt: null,
          dueAt: null,
          decision: null,
        },
      ],
    };
    expect(
      candidateSchedule(profile, [
        {
          id: 'booking-1',
          applicationId: 'application-1',
          status: 'confirmed',
          startAt: '2026-08-20T10:00:00Z',
          endAt: '2026-08-20T11:00:00Z',
          candidateTimezone: 'Europe/Dublin',
        },
      ]).items[0],
    ).toMatchObject({ assessmentTitle: 'Assessment', selected: true });
    expect(
      candidateSupportCases({
        total: 1,
        items: [
          {
            id: 'case-1',
            category: 'assessment',
            severity: 'critical',
            subject: 'Unable to start',
            status: 'awaiting_internal',
            createdAt: '2026-08-16T10:00:00Z',
            updatedAt: '2026-08-16T10:00:00Z',
          },
        ],
      }).items[0],
    ).toMatchObject({ priority: 'high', status: 'in_progress' });
  });
});
