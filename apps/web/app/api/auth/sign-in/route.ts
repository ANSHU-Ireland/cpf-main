export const dynamic = 'force-dynamic';

interface SignInBody {
  readonly email?: unknown;
  readonly password?: unknown;
  readonly workspace?: unknown;
}

interface AuthSession {
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly mfaRequired: boolean;
  readonly passwordResetRequired?: boolean;
}

interface UserProfile {
  readonly userType: string;
  readonly tenant: { readonly roles?: readonly string[] } | null;
}

const WORKSPACE_ROLES: Readonly<Record<string, readonly string[]>> = {
  '/candidate': ['candidate'],
  '/review': ['reviewer'],
  '/employer': ['employer_admin', 'employer_admin_approver'],
  '/admin': ['system_admin', 'platform_staff'],
  '/governance': ['governance_officer', 'employer_admin'],
  '/operations': ['operations_admin', 'system_admin', 'platform_staff'],
  '/support': ['support_agent', 'system_admin', 'platform_staff'],
  '/audit/evidence': ['auditor', 'governance_officer', 'system_admin', 'platform_staff'],
};

function apiUrl(path: string): URL {
  const base = process.env.CPF_API_BASE_URL?.trim() || 'http://127.0.0.1:3000';
  const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
  if (url.origin !== new URL(base).origin)
    throw new Error('Authentication path must be same-origin');
  return url;
}

function sessionCookie(token: string, expiresAt: string): string {
  const name = process.env.CPF_SESSION_COOKIE_NAME?.trim() || 'cpf_session';
  const secure = process.env.CPF_SESSION_COOKIE_SECURE === 'true' ? '; Secure' : '';
  const remainingSeconds = Math.max(
    0,
    Math.min(86_400, Math.floor((Date.parse(expiresAt) - Date.now()) / 1_000)),
  );
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${String(remainingSeconds)}${secure}`;
}

function permittedWorkspace(requested: string, roles: readonly string[]): string | null {
  const permittedRoles = WORKSPACE_ROLES[requested];
  if (permittedRoles === undefined) return null;
  return permittedRoles.some((role) => roles.includes(role)) ? requested : null;
}

function defaultWorkspace(profile: UserProfile, roles: readonly string[]): string {
  if (profile.userType === 'candidate' || roles.includes('candidate')) return '/candidate';
  if (roles.includes('reviewer')) return '/review';
  if (roles.includes('system_admin') || roles.includes('platform_staff')) return '/admin';
  if (roles.includes('governance_officer')) return '/governance';
  if (roles.includes('support_agent')) return '/support';
  return '/employer';
}

async function problemMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { readonly detail?: unknown; readonly title?: unknown };
    if (typeof body.detail === 'string') return body.detail;
    if (typeof body.title === 'string') return body.title;
  } catch {
    // Use a non-sensitive fallback for unexpected upstream responses.
  }
  return response.status === 401 ? 'Email or password is incorrect.' : 'Sign-in is unavailable.';
}

/** Authenticates against the private CPF API and keeps the bearer token in an HttpOnly cookie. */
export async function POST(request: Request): Promise<Response> {
  let body: SignInBody;
  try {
    body = (await request.json()) as SignInBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (email === '' || !email.includes('@')) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 422 });
  }
  if (password.length < 8) {
    return Response.json({ error: 'Enter your password.' }, { status: 422 });
  }

  let loginResponse: Response;
  try {
    loginResponse = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return Response.json({ error: 'The identity service is unavailable.' }, { status: 503 });
  }
  if (!loginResponse.ok) {
    return Response.json(
      { error: await problemMessage(loginResponse) },
      { status: loginResponse.status },
    );
  }

  const session = (await loginResponse.json()) as AuthSession;
  if (session.mfaRequired) {
    return Response.json({ mfaRequired: true, redirectTo: '/mfa' }, { status: 200 });
  }

  let profileResponse: Response;
  try {
    profileResponse = await fetch(apiUrl('/me'), {
      headers: { authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return Response.json({ error: 'Unable to load your workspace.' }, { status: 503 });
  }
  if (!profileResponse.ok) {
    return Response.json({ error: await problemMessage(profileResponse) }, { status: 502 });
  }

  const profile = (await profileResponse.json()) as UserProfile;
  const roles = profile.tenant?.roles ?? [];
  const requestedWorkspace = typeof body.workspace === 'string' ? body.workspace.trim() : '';
  const redirectTo =
    permittedWorkspace(requestedWorkspace, roles) ?? defaultWorkspace(profile, roles);

  return Response.json(
    {
      mfaRequired: false,
      passwordResetRequired: session.passwordResetRequired === true,
      redirectTo,
    },
    {
      headers: {
        'set-cookie': sessionCookie(session.accessToken, session.expiresAt),
        'cache-control': 'no-store',
      },
    },
  );
}
