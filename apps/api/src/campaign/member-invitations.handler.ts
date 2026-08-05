import {
  createMemberInvitation,
  resendMemberInvitation,
  revokeMemberInvitation,
  parseMemberInvitationCreate,
  parseMemberInvitationId,
  type MemberInvitationRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface MemberInvitationService {
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
  resend(actor: Actor, id: string): Promise<HttpResponse>;
  revoke(actor: Actor, id: string): Promise<HttpResponse>;
}

export function createMemberInvitationService(deps: {
  repository: MemberInvitationRepository;
}): MemberInvitationService {
  return {
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseMemberInvitationCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createMemberInvitation(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.invitation, correlationId);
    },
    resend: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const mid = parseMemberInvitationId(id);
      if (mid === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const r = await resendMemberInvitation(deps, actor, mid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.invitation, correlationId);
    },
    revoke: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const mid = parseMemberInvitationId(id);
      if (mid === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const r = await revokeMemberInvitation(deps, actor, mid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(204, {}, correlationId);
    },
  };
}

export async function handleCreateMemberInvitation(
  svc: MemberInvitationService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}

export async function handleResendMemberInvitation(
  svc: MemberInvitationService,
  req: { actor: Actor; invitationId: string },
): Promise<HttpResponse> {
  return svc.resend(req.actor, req.invitationId);
}

export async function handleRevokeMemberInvitation(
  svc: MemberInvitationService,
  req: { actor: Actor; invitationId: string },
): Promise<HttpResponse> {
  return svc.revoke(req.actor, req.invitationId);
}
