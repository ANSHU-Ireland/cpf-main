import {
  parseLogin,
  parsePasswordForgot,
  parsePasswordReset,
  parsePasswordChange,
  parseEmailChange,
  parseToken,
  parseEmailRequest,
  parseMfaChallenge,
  parseMfaEnroll,
  parseAuthListQuery,
  parseUuid,
  authenticate,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendVerification,
  challengeMfa,
  logout,
  logoutAll,
  changePassword,
  changeEmail,
  confirmEmailChange,
  listMfaMethods,
  enrollMfaMethod,
  removeMfaMethod,
  rotateRecoveryCodes,
  type Actor,
  type AuthRepository,
} from '@cpf/account';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface AuthService {
  login(body: unknown): Promise<HttpResponse>;
  passwordForgot(body: unknown): Promise<HttpResponse>;
  passwordReset(body: unknown): Promise<HttpResponse>;
  emailVerify(body: unknown): Promise<HttpResponse>;
  emailResend(body: unknown): Promise<HttpResponse>;
  mfaChallenge(body: unknown): Promise<HttpResponse>;
  logout(actor: Actor, body: unknown): Promise<HttpResponse>;
  logoutAll(actor: Actor, body: unknown): Promise<HttpResponse>;
  passwordChange(actor: Actor, body: unknown): Promise<HttpResponse>;
  emailChange(actor: Actor, body: unknown): Promise<HttpResponse>;
  emailChangeConfirm(actor: Actor, body: unknown): Promise<HttpResponse>;
  listMfaMethods(actor: Actor, query: unknown): Promise<HttpResponse>;
  enrollMfaMethod(actor: Actor, body: unknown): Promise<HttpResponse>;
  removeMfaMethod(actor: Actor, methodId: string): Promise<HttpResponse>;
  rotateRecoveryCodes(actor: Actor): Promise<HttpResponse>;
}

function validationProblem(correlationId: string, errors: readonly string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Validation',
    correlationId,
    errors: errors.map((message) => ({ detail: message })),
  });
}

export function createAuthService(deps: { repository: AuthRepository }): AuthService {
  return {
    login: async (body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseLogin(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await authenticate(deps, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.session, correlationId);
    },
    passwordForgot: async (body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parsePasswordForgot(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      await requestPasswordReset(deps, parsed.value);
      return jsonResponse(200, { accepted: true }, correlationId);
    },
    passwordReset: async (body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parsePasswordReset(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await resetPassword(deps, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { reset: true }, correlationId);
    },
    emailVerify: async (body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseToken(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await verifyEmail(deps, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { verified: true }, correlationId);
    },
    emailResend: async (body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseEmailRequest(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      await resendVerification(deps, parsed.value);
      return jsonResponse(200, { accepted: true }, correlationId);
    },
    mfaChallenge: async (body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseMfaChallenge(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await challengeMfa(deps, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.session, correlationId);
    },
    logout: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await logout(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { loggedOut: true }, correlationId);
    },
    logoutAll: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await logoutAll(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { loggedOut: true }, correlationId);
    },
    passwordChange: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parsePasswordChange(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await changePassword(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { changed: true }, correlationId);
    },
    emailChange: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseEmailChange(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await changeEmail(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { started: true }, correlationId);
    },
    emailChangeConfirm: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseToken(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await confirmEmailChange(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { confirmed: true }, correlationId);
    },
    listMfaMethods: async (actor, query) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseAuthListQuery(query);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await listMfaMethods(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.page, correlationId);
    },
    enrollMfaMethod: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseMfaEnroll(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await enrollMfaMethod(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.method, correlationId);
    },
    removeMfaMethod: async (actor, methodId) => {
      const correlationId = ensureCorrelationId();
      const id = parseUuid(methodId);
      if (id === null)
        return problemResponse({
          status: 422,
          title: 'Invalid ID',
          correlationId,
          detail: 'methodId must be a valid UUID.',
        });
      const r = await removeMfaMethod(deps, actor, id);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { removed: true }, correlationId);
    },
    rotateRecoveryCodes: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await rotateRecoveryCodes(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.codes, correlationId);
    },
  };
}

export const handleAuthLogin = (svc: AuthService, req: { body: unknown }): Promise<HttpResponse> =>
  svc.login(req.body);
export const handleAuthPasswordForgot = (
  svc: AuthService,
  req: { body: unknown },
): Promise<HttpResponse> => svc.passwordForgot(req.body);
export const handleAuthPasswordReset = (
  svc: AuthService,
  req: { body: unknown },
): Promise<HttpResponse> => svc.passwordReset(req.body);
export const handleAuthEmailVerify = (
  svc: AuthService,
  req: { body: unknown },
): Promise<HttpResponse> => svc.emailVerify(req.body);
export const handleAuthEmailResend = (
  svc: AuthService,
  req: { body: unknown },
): Promise<HttpResponse> => svc.emailResend(req.body);
export const handleAuthMfaChallenge = (
  svc: AuthService,
  req: { body: unknown },
): Promise<HttpResponse> => svc.mfaChallenge(req.body);
export const handleAuthLogout = (
  svc: AuthService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> => svc.logout(req.actor, req.body);
export const handleAuthLogoutAll = (
  svc: AuthService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> => svc.logoutAll(req.actor, req.body);
export const handleAuthPasswordChange = (
  svc: AuthService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> => svc.passwordChange(req.actor, req.body);
export const handleAuthEmailChange = (
  svc: AuthService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> => svc.emailChange(req.actor, req.body);
export const handleAuthEmailChangeConfirm = (
  svc: AuthService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> => svc.emailChangeConfirm(req.actor, req.body);
export const handleGetAuthMfaMethods = (
  svc: AuthService,
  req: { actor: Actor; query: unknown },
): Promise<HttpResponse> => svc.listMfaMethods(req.actor, req.query);
export const handlePostAuthMfaMethod = (
  svc: AuthService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> => svc.enrollMfaMethod(req.actor, req.body);
export const handleDeleteAuthMfaMethod = (
  svc: AuthService,
  req: { actor: Actor; methodId: string },
): Promise<HttpResponse> => svc.removeMfaMethod(req.actor, req.methodId);
export const handleAuthRotateRecoveryCodes = (
  svc: AuthService,
  req: { actor: Actor },
): Promise<HttpResponse> => svc.rotateRecoveryCodes(req.actor);
