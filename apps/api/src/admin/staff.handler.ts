import {
  listStaff,
  createStaffInvitation,
  resendStaffInvitation,
  revokeStaffInvitation,
  updateStaffRoles,
  updateStaffStatus,
  parseStaffInvitationCreate,
  parseStaffRolesUpdate,
  parseStaffStatusUpdate,
  parseStaffId,
  type StaffRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface StaffService {
  list(actor: Actor): Promise<HttpResponse>;
  createInvitation(actor: Actor, body: unknown): Promise<HttpResponse>;
  resendInvitation(actor: Actor, id: string): Promise<HttpResponse>;
  revokeInvitation(actor: Actor, id: string): Promise<HttpResponse>;
  updateRoles(actor: Actor, userId: string, body: unknown): Promise<HttpResponse>;
  updateStatus(actor: Actor, userId: string, body: unknown): Promise<HttpResponse>;
}

function invalidId(correlationId: string): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Invalid ID',
    correlationId,
    detail: 'id must be a valid UUID.',
  });
}

function validationProblem(correlationId: string, errors: string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Validation',
    correlationId,
    errors: errors.map((message) => ({ detail: message })),
  });
}

export function createStaffService(deps: { repository: StaffRepository }): StaffService {
  return {
    list: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await listStaff(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
    },
    createInvitation: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseStaffInvitationCreate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await createStaffInvitation(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.invitation, correlationId);
    },
    resendInvitation: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const sid = parseStaffId(id);
      if (sid === null) return invalidId(correlationId);
      const r = await resendStaffInvitation(deps, actor, sid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.invitation, correlationId);
    },
    revokeInvitation: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const sid = parseStaffId(id);
      if (sid === null) return invalidId(correlationId);
      const r = await revokeStaffInvitation(deps, actor, sid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(204, {}, correlationId);
    },
    updateRoles: async (actor, userId, body) => {
      const correlationId = ensureCorrelationId();
      const uid = parseStaffId(userId);
      if (uid === null) return invalidId(correlationId);
      const parsed = parseStaffRolesUpdate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await updateStaffRoles(deps, actor, uid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.staff, correlationId);
    },
    updateStatus: async (actor, userId, body) => {
      const correlationId = ensureCorrelationId();
      const uid = parseStaffId(userId);
      if (uid === null) return invalidId(correlationId);
      const parsed = parseStaffStatusUpdate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await updateStaffStatus(deps, actor, uid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.staff, correlationId);
    },
  };
}

export async function handleListStaff(
  svc: StaffService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  return svc.list(req.actor);
}

export async function handleCreateStaffInvitation(
  svc: StaffService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.createInvitation(req.actor, req.body);
}

export async function handleResendStaffInvitation(
  svc: StaffService,
  req: { actor: Actor; invitationId: string },
): Promise<HttpResponse> {
  return svc.resendInvitation(req.actor, req.invitationId);
}

export async function handleRevokeStaffInvitation(
  svc: StaffService,
  req: { actor: Actor; invitationId: string },
): Promise<HttpResponse> {
  return svc.revokeInvitation(req.actor, req.invitationId);
}

export async function handleUpdateStaffRoles(
  svc: StaffService,
  req: { actor: Actor; userId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.updateRoles(req.actor, req.userId, req.body);
}

export async function handleUpdateStaffStatus(
  svc: StaffService,
  req: { actor: Actor; userId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.updateStatus(req.actor, req.userId, req.body);
}
