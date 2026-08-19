import type { ApplicationStatus, CandidateApplicationView } from './types';

export interface PlatformCandidateApplication {
  readonly applicationId: string;
  readonly employerName: string;
  readonly roleName: string;
  readonly assessmentTitle: string;
  readonly status: string;
  readonly appliedAt: string;
  readonly invitedAt: string | null;
  readonly dueAt: string | null;
  readonly decision: CandidateApplicationView['decision'];
}

export interface PlatformCandidateProfile {
  readonly candidateId: string;
  readonly email: string;
  readonly displayName: string;
  readonly applications: readonly PlatformCandidateApplication[];
}

function applicationStatus(application: PlatformCandidateApplication): ApplicationStatus {
  if (
    application.decision !== null ||
    ['progressed', 'not_progressed'].includes(application.status)
  ) {
    return 'decision_available';
  }
  switch (application.status) {
    case 'started':
      return 'in_progress';
    case 'submitted':
      return 'submitted';
    case 'in_review':
    case 'reviewed':
      return 'under_review';
    case 'withdrawn':
    case 'cancelled':
      return 'withdrawn';
    case 'created':
    case 'invited':
    default:
      return 'invited';
  }
}

export function candidateApplicationView(
  application: PlatformCandidateApplication,
): CandidateApplicationView {
  return {
    id: application.applicationId,
    employerName: application.employerName,
    role: application.roleName,
    assessmentTitle: application.assessmentTitle,
    status: applicationStatus(application),
    invitedAt: application.invitedAt ?? application.appliedAt,
    dueAt: application.dueAt,
    decision: application.decision,
  };
}
