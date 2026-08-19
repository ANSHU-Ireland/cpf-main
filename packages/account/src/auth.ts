import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import type { Actor } from './types.js';

/** MFA/passkey method types a caller may enrol. */
export const MFA_METHOD_TYPES = ['totp', 'sms', 'passkey', 'recovery_code'] as const;
export type MfaMethodType = (typeof MFA_METHOD_TYPES)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 12;
const MAX_STRING = 512;

export interface AuthSessionRecord {
  readonly sessionId: string;
  readonly userId: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly mfaRequired: boolean;
}

export interface AuthMethodRecord {
  readonly id: string;
  readonly userId: string;
  readonly methodType: MfaMethodType;
  readonly label: string | null;
  readonly confirmedAt: string | null;
  readonly createdAt: string;
}

export interface AuthMethodPage {
  readonly items: readonly AuthMethodRecord[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface RecoveryCodesRecord {
  readonly codes: readonly string[];
  readonly generatedAt: string;
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}
export interface PasswordForgotInput {
  readonly email: string;
}
export interface PasswordResetInput {
  readonly token: string;
  readonly newPassword: string;
}
export interface PasswordChangeInput {
  readonly currentPassword: string;
  readonly newPassword: string;
}
export interface EmailChangeInput {
  readonly newEmail: string;
}
export interface TokenInput {
  readonly token: string;
}
export interface EmailInput {
  readonly email: string;
}
export interface MfaChallengeInput {
  readonly challengeId: string;
  readonly code: string;
}
export interface MfaEnrollInput {
  readonly methodType: MfaMethodType;
  readonly label?: string;
}
export interface AuthListQuery {
  readonly limit: number;
  readonly cursor: string | null;
}

export interface AuthRepository {
  login(input: LoginInput): Promise<AuthSessionRecord | null>;
  logout(actor: Actor): Promise<boolean>;
  logoutAll(actor: Actor): Promise<boolean>;
  requestPasswordReset(input: PasswordForgotInput): Promise<void>;
  resetPassword(input: PasswordResetInput): Promise<boolean>;
  changePassword(actor: Actor, input: PasswordChangeInput): Promise<boolean>;
  verifyEmail(input: TokenInput): Promise<boolean>;
  resendVerification(input: EmailInput): Promise<void>;
  changeEmail(actor: Actor, input: EmailChangeInput): Promise<boolean>;
  confirmEmailChange(actor: Actor, input: TokenInput): Promise<boolean>;
  listMfaMethods(actor: Actor, query: AuthListQuery): Promise<AuthMethodPage>;
  enrollMfaMethod(actor: Actor, input: MfaEnrollInput): Promise<AuthMethodRecord | null>;
  removeMfaMethod(actor: Actor, methodId: string): Promise<boolean>;
  challengeMfa(input: MfaChallengeInput): Promise<AuthSessionRecord | null>;
  rotateRecoveryCodes(actor: Actor): Promise<RecoveryCodesRecord | null>;
}

export interface AuthDeps {
  readonly repository: AuthRepository;
  readonly permissions?: readonly Permission[];
}

export type ParseResultAuth<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly string[] };
type ParseResult<T> = ParseResultAuth<T>;

type Result<T> =
  | ({ readonly ok: true } & T)
  | { readonly ok: false; readonly status: number; readonly reason: string };

function isObject(raw: unknown): raw is Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw);
}

function readString(
  input: Record<string, unknown>,
  key: string,
  errors: string[],
  opts: { email?: boolean; minLength?: number } = {},
): string | undefined {
  const v = input[key];
  if (typeof v !== 'string' || v.length === 0 || v.length > MAX_STRING) {
    errors.push(`${key} must be a non-empty string up to ${MAX_STRING} chars`);
    return undefined;
  }
  if (opts.email === true && !EMAIL_RE.test(v)) {
    errors.push(`${key} must be a valid email address`);
    return undefined;
  }
  if (opts.minLength !== undefined && v.length < opts.minLength) {
    errors.push(`${key} must be at least ${opts.minLength} characters`);
    return undefined;
  }
  return v;
}

function authorize(deps: AuthDeps, actor: Actor, action: 'read' | 'write'): boolean {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: [...actor.roles, AUTHENTICATED_ROLE] },
    action,
    { type: 'self_auth', tenantId: actor.tenantId },
    deps.permissions ?? ACCOUNT_PERMISSIONS,
  );
  return decision.allowed;
}

export function parseUuid(raw: unknown): string | null {
  return typeof raw === 'string' && UUID_RE.test(raw) ? raw : null;
}

export function parseLogin(raw: unknown): ParseResult<LoginInput> {
  if (!isObject(raw)) return { ok: false, errors: ['body must be a JSON object'] };
  const errors: string[] = [];
  const email = readString(raw, 'email', errors, { email: true });
  const password = readString(raw, 'password', errors);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { email: email as string, password: password as string } };
}

export function parsePasswordForgot(raw: unknown): ParseResult<PasswordForgotInput> {
  if (!isObject(raw)) return { ok: false, errors: ['body must be a JSON object'] };
  const errors: string[] = [];
  const email = readString(raw, 'email', errors, { email: true });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { email: email as string } };
}

export function parsePasswordReset(raw: unknown): ParseResult<PasswordResetInput> {
  if (!isObject(raw)) return { ok: false, errors: ['body must be a JSON object'] };
  const errors: string[] = [];
  const token = readString(raw, 'token', errors);
  const newPassword = readString(raw, 'newPassword', errors, { minLength: MIN_PASSWORD });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { token: token as string, newPassword: newPassword as string } };
}

export function parsePasswordChange(raw: unknown): ParseResult<PasswordChangeInput> {
  if (!isObject(raw)) return { ok: false, errors: ['body must be a JSON object'] };
  const errors: string[] = [];
  const currentPassword = readString(raw, 'currentPassword', errors);
  const newPassword = readString(raw, 'newPassword', errors, { minLength: MIN_PASSWORD });
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { currentPassword: currentPassword as string, newPassword: newPassword as string },
  };
}

export function parseEmailChange(raw: unknown): ParseResult<EmailChangeInput> {
  if (!isObject(raw)) return { ok: false, errors: ['body must be a JSON object'] };
  const errors: string[] = [];
  const newEmail = readString(raw, 'newEmail', errors, { email: true });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { newEmail: newEmail as string } };
}

export function parseToken(raw: unknown): ParseResult<TokenInput> {
  if (!isObject(raw)) return { ok: false, errors: ['body must be a JSON object'] };
  const errors: string[] = [];
  const token = readString(raw, 'token', errors);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { token: token as string } };
}

export function parseEmailRequest(raw: unknown): ParseResult<EmailInput> {
  if (!isObject(raw)) return { ok: false, errors: ['body must be a JSON object'] };
  const errors: string[] = [];
  const email = readString(raw, 'email', errors, { email: true });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { email: email as string } };
}

export function parseMfaChallenge(raw: unknown): ParseResult<MfaChallengeInput> {
  if (!isObject(raw)) return { ok: false, errors: ['body must be a JSON object'] };
  const errors: string[] = [];
  const challengeId = readString(raw, 'challengeId', errors);
  const code = readString(raw, 'code', errors);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { challengeId: challengeId as string, code: code as string } };
}

export function parseMfaEnroll(raw: unknown): ParseResult<MfaEnrollInput> {
  if (!isObject(raw)) return { ok: false, errors: ['body must be a JSON object'] };
  const errors: string[] = [];
  const methodType = raw.methodType;
  if (typeof methodType !== 'string' || !MFA_METHOD_TYPES.includes(methodType as MfaMethodType)) {
    errors.push(`methodType must be one of: ${MFA_METHOD_TYPES.join(', ')}`);
  }
  const value: { methodType: MfaMethodType; label?: string } = {
    methodType: methodType as MfaMethodType,
  };
  if (raw.label !== undefined) {
    if (typeof raw.label !== 'string' || raw.label.length === 0 || raw.label.length > MAX_STRING) {
      errors.push(`label must be a non-empty string up to ${MAX_STRING} chars`);
    } else {
      value.label = raw.label;
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export function parseAuthListQuery(raw: unknown): ParseResult<AuthListQuery> {
  const input = isObject(raw) ? raw : {};
  const errors: string[] = [];
  let limit = 25;
  if (input.limit !== undefined) {
    if (
      typeof input.limit !== 'number' ||
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 100
    ) {
      errors.push('limit must be an integer between 1 and 100');
    } else {
      limit = input.limit;
    }
  }
  let cursor: string | null = null;
  if (input.cursor !== undefined) {
    if (typeof input.cursor !== 'string' || input.cursor.length > MAX_STRING) {
      errors.push('cursor must be a string');
    } else {
      cursor = input.cursor;
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { limit, cursor } };
}

// --- Public operations (no authenticated actor) ---

/** `post_auth_login`: verify credentials and issue a session, or 401. */
export async function authenticate(
  deps: AuthDeps,
  input: LoginInput,
): Promise<Result<{ session: AuthSessionRecord }>> {
  const session = await deps.repository.login(input);
  if (session === null) return { ok: false, status: 401, reason: 'Invalid credentials.' };
  return { ok: true, session };
}

/** `post_auth_password_forgot`: always succeeds to avoid account enumeration. */
export async function requestPasswordReset(
  deps: AuthDeps,
  input: PasswordForgotInput,
): Promise<Result<Record<string, never>>> {
  await deps.repository.requestPasswordReset(input);
  return { ok: true } as Result<Record<string, never>>;
}

/** `post_auth_password_reset`: consume a one-time reset token, or 400. */
export async function resetPassword(
  deps: AuthDeps,
  input: PasswordResetInput,
): Promise<Result<Record<string, never>>> {
  const done = await deps.repository.resetPassword(input);
  if (!done) return { ok: false, status: 400, reason: 'Invalid or expired token.' };
  return { ok: true } as Result<Record<string, never>>;
}

/** `post_auth_email_verify`: consume a verification token, or 400. */
export async function verifyEmail(
  deps: AuthDeps,
  input: TokenInput,
): Promise<Result<Record<string, never>>> {
  const done = await deps.repository.verifyEmail(input);
  if (!done) return { ok: false, status: 400, reason: 'Invalid or expired token.' };
  return { ok: true } as Result<Record<string, never>>;
}

/** `post_auth_email_resend`: always succeeds to avoid account enumeration. */
export async function resendVerification(
  deps: AuthDeps,
  input: EmailInput,
): Promise<Result<Record<string, never>>> {
  await deps.repository.resendVerification(input);
  return { ok: true } as Result<Record<string, never>>;
}

/** `post_auth_mfa_challenge`: complete a challenge and issue a session, or 401. */
export async function challengeMfa(
  deps: AuthDeps,
  input: MfaChallengeInput,
): Promise<Result<{ session: AuthSessionRecord }>> {
  const session = await deps.repository.challengeMfa(input);
  if (session === null) return { ok: false, status: 401, reason: 'Invalid challenge.' };
  return { ok: true, session };
}

// --- Authenticated operations ---

/** `post_auth_logout`: revoke the caller's current session. */
export async function logout(deps: AuthDeps, actor: Actor): Promise<Result<Record<string, never>>> {
  if (!authorize(deps, actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const done = await deps.repository.logout(actor);
  if (!done) return { ok: false, status: 404, reason: 'No active session.' };
  return { ok: true } as Result<Record<string, never>>;
}

/** `post_auth_logout_all`: revoke all of the caller's sessions. */
export async function logoutAll(
  deps: AuthDeps,
  actor: Actor,
): Promise<Result<Record<string, never>>> {
  if (!authorize(deps, actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const done = await deps.repository.logoutAll(actor);
  if (!done) return { ok: false, status: 404, reason: 'No active session.' };
  return { ok: true } as Result<Record<string, never>>;
}

/** `post_auth_password_change`: change password after recent authentication. */
export async function changePassword(
  deps: AuthDeps,
  actor: Actor,
  input: PasswordChangeInput,
): Promise<Result<Record<string, never>>> {
  if (!authorize(deps, actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const done = await deps.repository.changePassword(actor, input);
  if (!done) return { ok: false, status: 400, reason: 'Current password is incorrect.' };
  return { ok: true } as Result<Record<string, never>>;
}

/** `post_auth_email_change`: start a dual-confirmation email change. */
export async function changeEmail(
  deps: AuthDeps,
  actor: Actor,
  input: EmailChangeInput,
): Promise<Result<Record<string, never>>> {
  if (!authorize(deps, actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const done = await deps.repository.changeEmail(actor, input);
  if (!done) return { ok: false, status: 409, reason: 'Email already in use.' };
  return { ok: true } as Result<Record<string, never>>;
}

/** `post_auth_email_change_confirm`: confirm one side of an email change. */
export async function confirmEmailChange(
  deps: AuthDeps,
  actor: Actor,
  input: TokenInput,
): Promise<Result<Record<string, never>>> {
  if (!authorize(deps, actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const done = await deps.repository.confirmEmailChange(actor, input);
  if (!done) return { ok: false, status: 400, reason: 'Invalid or expired token.' };
  return { ok: true } as Result<Record<string, never>>;
}

/** `get_auth_mfa_methods`: list the caller's enrolled methods. */
export async function listMfaMethods(
  deps: AuthDeps,
  actor: Actor,
  query: AuthListQuery,
): Promise<Result<{ page: AuthMethodPage }>> {
  if (!authorize(deps, actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  const page = await deps.repository.listMfaMethods(actor, query);
  return { ok: true, page };
}

/** `post_auth_mfa_methods`: enrol a new MFA method or passkey. */
export async function enrollMfaMethod(
  deps: AuthDeps,
  actor: Actor,
  input: MfaEnrollInput,
): Promise<Result<{ method: AuthMethodRecord }>> {
  if (!authorize(deps, actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const method = await deps.repository.enrollMfaMethod(actor, input);
  if (method === null) {
    return { ok: false, status: 503, reason: 'MFA provider unavailable.' };
  }
  return { ok: true, method };
}

/** `delete_auth_mfa_methods_methodId`: remove an MFA method after step-up. */
export async function removeMfaMethod(
  deps: AuthDeps,
  actor: Actor,
  methodId: string,
): Promise<Result<Record<string, never>>> {
  if (!authorize(deps, actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const done = await deps.repository.removeMfaMethod(actor, methodId);
  if (!done) return { ok: false, status: 404, reason: 'Method not found.' };
  return { ok: true } as Result<Record<string, never>>;
}

/** `post_auth_mfa_recovery_codes_rotate`: replace the caller's recovery codes. */
export async function rotateRecoveryCodes(
  deps: AuthDeps,
  actor: Actor,
): Promise<Result<{ codes: RecoveryCodesRecord }>> {
  if (!authorize(deps, actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const codes = await deps.repository.rotateRecoveryCodes(actor);
  if (codes === null) return { ok: false, status: 404, reason: 'No recovery codes to rotate.' };
  return { ok: true, codes };
}
