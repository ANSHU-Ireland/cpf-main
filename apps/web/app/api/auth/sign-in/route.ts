export const dynamic = 'force-dynamic';

interface SignInBody {
  readonly email?: unknown;
  readonly password?: unknown;
  readonly workspace?: unknown;
}

const DEMO_PASSWORD = 'CPF-DEMO-2026';

const DEMO_ACCOUNTS: Readonly<
  Record<
    string,
    { readonly token: string; readonly redirectTo: string; readonly workspaces: string[] }
  >
> = {
  'candidate.one@northstar.invalid': {
    token: 'cpf-demo-candidate-token-2026',
    redirectTo: '/candidate',
    workspaces: ['/candidate'],
  },
  'reviewer@northstar.invalid': {
    token: 'cpf-demo-reviewer-token-2026',
    redirectTo: '/review',
    workspaces: ['/review'],
  },
  'admin@northstar.invalid': {
    token: 'cpf-demo-admin-token-2026',
    redirectTo: '/employer',
    workspaces: [
      '/employer',
      '/admin',
      '/governance',
      '/operations',
      '/support',
      '/audit/evidence',
    ],
  },
  'approver@northstar.invalid': {
    token: 'cpf-demo-approver-token-2026',
    redirectTo: '/employer',
    workspaces: ['/employer'],
  },
};

function sessionCookie(token: string): string {
  const name = process.env.CPF_SESSION_COOKIE_NAME?.trim() || 'cpf_session';
  const secure = process.env.CPF_SESSION_COOKIE_SECURE === 'true' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure}`;
}

/** Issues only deterministic, synthetic sessions that already exist in the isolated demo seed. */
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
    return Response.json(
      { error: 'Enter your password (at least 8 characters).' },
      { status: 422 },
    );
  }

  if (process.env.CPF_DEMO_MODE !== 'true') {
    return Response.json({ mfaRequired: true });
  }

  const account = DEMO_ACCOUNTS[email.toLowerCase()];
  if (account === undefined || password !== DEMO_PASSWORD) {
    return Response.json(
      { error: 'Use one of the synthetic demo accounts and the displayed demo password.' },
      { status: 401 },
    );
  }

  const requestedWorkspace = typeof body.workspace === 'string' ? body.workspace.trim() : '';
  const redirectTo = account.workspaces.includes(requestedWorkspace)
    ? requestedWorkspace
    : account.redirectTo;
  return Response.json(
    { mfaRequired: false, redirectTo },
    { headers: { 'set-cookie': sessionCookie(account.token), 'cache-control': 'no-store' } },
  );
}
