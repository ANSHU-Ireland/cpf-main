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

export interface CandidatePortalRepository {
  getProfile(actor: Actor): Promise<CandidateProfileData | null>;
  getInvitation(actor: Actor): Promise<CandidateInvitationData | null>;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };
export type GetCandidateProfileResult = Result<{ profile: CandidateProfileData }>;
export type GetCandidateInvitationResult = Result<{ invitation: CandidateInvitationData }>;

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
