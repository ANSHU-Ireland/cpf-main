import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Pool, PoolClient, QueryResultRow } from 'pg';
import type {
  AuthMethodPage,
  AuthMethodRecord,
  AuthRepository,
  AuthSessionRecord,
  EmailChangeInput,
  EmailInput,
  LoginInput,
  MfaChallengeInput,
  MfaEnrollInput,
  PasswordChangeInput,
  PasswordForgotInput,
  PasswordResetInput,
  RecoveryCodesRecord,
  TokenInput,
} from './auth.js';
import type { Actor } from './types.js';

interface LoginRow extends QueryResultRow {
  readonly session_id: string;
  readonly user_id: string;
  readonly expires_at: Date | string;
  readonly mfa_required: boolean;
  readonly password_reset_required: boolean;
}

export interface PasswordAuthOptions {
  readonly role?: string;
  readonly sessionTtlSeconds?: number;
  readonly deviceLabel?: string;
}

function assertSafeIdentifier(identifier: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function secretToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * PostgreSQL-backed password sessions for controlled UAT and local enterprise evaluation.
 * Password verification and verifier access remain inside SECURITY DEFINER database functions.
 * Production deployments can replace this adapter with the approved OIDC/SAML identity provider.
 */
export class PgPasswordAuthRepository implements AuthRepository {
  readonly #pool: Pool;
  readonly #role: string;
  readonly #sessionTtlSeconds: number;
  readonly #deviceLabel: string;

  constructor(pool: Pool, options: PasswordAuthOptions = {}) {
    this.#pool = pool;
    this.#role = options.role ?? 'cpf_app';
    assertSafeIdentifier(this.#role);
    this.#sessionTtlSeconds = Math.max(900, Math.min(86_400, options.sessionTtlSeconds ?? 28_800));
    this.#deviceLabel = options.deviceLabel ?? 'CPF web session';
  }

  async #transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.#pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE "${this.#role}"`);
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async login(input: LoginInput): Promise<AuthSessionRecord | null> {
    const sessionId = randomUUID();
    const accessToken = secretToken();
    const expiresAt = new Date(Date.now() + this.#sessionTtlSeconds * 1_000);
    const result = await this.#transaction((client) =>
      client.query<LoginRow>(`SELECT * FROM iam.login_with_password($1, $2, $3, $4, $5, $6)`, [
        input.email,
        input.password,
        sessionId,
        hashToken(accessToken),
        expiresAt,
        this.#deviceLabel,
      ]),
    );
    const row = result.rows[0];
    if (row === undefined) return null;
    return {
      sessionId: row.session_id,
      userId: row.user_id,
      accessToken,
      refreshToken: accessToken,
      expiresAt: new Date(row.expires_at).toISOString(),
      mfaRequired: row.mfa_required,
      passwordResetRequired: row.password_reset_required,
    };
  }

  async logout(actor: Actor): Promise<boolean> {
    return this.logoutAll(actor);
  }

  async logoutAll(actor: Actor): Promise<boolean> {
    const result = await this.#transaction((client) =>
      client.query<{ readonly affected: number }>(
        `SELECT iam.revoke_user_session($1, NULL) AS affected`,
        [actor.userId],
      ),
    );
    return Number(result.rows[0]?.affected ?? 0) > 0;
  }

  async requestPasswordReset(_input: PasswordForgotInput): Promise<void> {
    // Delivery is intentionally provider-owned. The public handler remains enumeration-safe.
  }

  async resetPassword(_input: PasswordResetInput): Promise<boolean> {
    // Fails closed until the notification provider can deliver and attest one-time reset tokens.
    return false;
  }

  async changePassword(actor: Actor, input: PasswordChangeInput): Promise<boolean> {
    const result = await this.#transaction((client) =>
      client.query<{ readonly changed: boolean }>(
        `SELECT iam.change_password($1, $2, $3, false) AS changed`,
        [actor.userId, input.currentPassword, input.newPassword],
      ),
    );
    return result.rows[0]?.changed === true;
  }

  async verifyEmail(_input: TokenInput): Promise<boolean> {
    return false;
  }

  async resendVerification(_input: EmailInput): Promise<void> {}

  async changeEmail(_actor: Actor, _input: EmailChangeInput): Promise<boolean> {
    return false;
  }

  async confirmEmailChange(_actor: Actor, _input: TokenInput): Promise<boolean> {
    return false;
  }

  async listMfaMethods(_actor: Actor): Promise<AuthMethodPage> {
    return { items: [], nextCursor: null, total: 0 };
  }

  async enrollMfaMethod(_actor: Actor, _input: MfaEnrollInput): Promise<AuthMethodRecord | null> {
    return null;
  }

  async removeMfaMethod(_actor: Actor, _methodId: string): Promise<boolean> {
    return false;
  }

  async challengeMfa(_input: MfaChallengeInput): Promise<AuthSessionRecord | null> {
    return null;
  }

  async rotateRecoveryCodes(_actor: Actor): Promise<RecoveryCodesRecord | null> {
    return null;
  }
}
