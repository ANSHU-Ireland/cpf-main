export const dynamic = 'force-dynamic';

interface SignInBody {
  readonly email?: unknown;
  readonly password?: unknown;
}

/**
 * Synthetic sign-in: validates shape only and reports whether an MFA step follows. It never issues
 * a real session or accepts real credentials — the demo environment carries no live identities.
 */
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

  return Response.json({ mfaRequired: true });
}
