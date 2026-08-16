import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

export interface CandidateProfileData {
  readonly candidateId: string;
  readonly email: string;
  readonly displayName: string;
  readonly applications: readonly {
    applicationId: string;
    campaignTitle: string;
    status: string;
  }[];
}

export interface CandidateInvitationData {
  readonly invitationId: string;
  readonly campaignTitle: string;
  readonly expiresAt: string;
  readonly status: string;
}

export interface CandidateApplicationStatusData {
  readonly applicationId: string;
  readonly employerName: string;
  readonly roleName: string;
  readonly assessmentTitle: string;
  readonly status: string;
  readonly appliedAt: string;
  readonly invitedAt: string | null;
  readonly dueAt: string | null;
  readonly decision: {
    readonly outcome: string;
    readonly rationale: string;
    readonly decidedBy: string;
    readonly issuedAt: string;
  } | null;
}

export interface CandidatePortalRepository {
  getProfile(actor: Actor): Promise<CandidateProfileData | null>;
  getInvitation(actor: Actor): Promise<CandidateInvitationData | null>;
  getApplicationStatus(
    actor: Actor,
    applicationId: string,
  ): Promise<CandidateApplicationStatusData | null>;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };
export type GetCandidateProfileResult = Result<{ profile: CandidateProfileData }>;
export type GetCandidateInvitationResult = Result<{ invitation: CandidateInvitationData }>;
export type GetCandidateApplicationStatusResult = Result<{
  application: CandidateApplicationStatusData;
}>;

export async function getCandidateProfile(
  deps: { repository: CandidatePortalRepository },
  actor: Actor,
): Promise<GetCandidateProfileResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'candidate', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const profile = await deps.repository.getProfile(actor);
  if (profile === null) return { ok: false, status: 404, reason: 'Candidate profile not found.' };
  return { ok: true, profile };
}

export async function getCandidateInvitation(
  deps: { repository: CandidatePortalRepository },
  actor: Actor,
): Promise<GetCandidateInvitationResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'candidate', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const invitation = await deps.repository.getInvitation(actor);
  if (invitation === null) return { ok: false, status: 404, reason: 'No pending invitation.' };
  return { ok: true, invitation };
}

export async function getCandidateApplicationStatus(
  deps: { repository: CandidatePortalRepository },
  actor: Actor,
  applicationId: string,
): Promise<GetCandidateApplicationStatusResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'application', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const application = await deps.repository.getApplicationStatus(actor, applicationId);
  if (application === null) return { ok: false, status: 404, reason: 'Application not found.' };
  return { ok: true, application };
}
