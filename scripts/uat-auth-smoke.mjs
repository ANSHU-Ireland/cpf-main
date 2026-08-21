import process from 'node:process';

/* global fetch */

const apiBase = (process.env.CPF_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const password = process.env.CPF_UAT_SHARED_PASSWORD ?? 'CPF-UAT-ChangeMe-2026!';
const personas = [
  { name: 'candidate', email: 'candidate.one@northstar.invalid' },
  { name: 'reviewer', email: 'reviewer@northstar.invalid' },
  { name: 'employer', email: 'admin@northstar.invalid' },
  { name: 'approver', email: 'approver@northstar.invalid' },
  { name: 'governance', email: 'governance@tenant-01.cpf-uat.invalid' },
  { name: 'operations', email: 'operations@tenant-01.cpf-uat.invalid' },
  { name: 'support', email: 'support@tenant-01.cpf-uat.invalid' },
  { name: 'auditor', email: 'auditor@tenant-01.cpf-uat.invalid' },
  { name: 'platform-admin', email: 'platform.admin@cpf-uat.invalid' },
];

async function json(response) {
  const text = await response.text();
  try {
    return text === '' ? null : JSON.parse(text);
  } catch {
    throw new Error(`${response.url} returned non-JSON content`);
  }
}

const readiness = await fetch(`${apiBase}/readyz`, { cache: 'no-store' });
if (!readiness.ok) throw new Error(`API readiness failed with ${readiness.status}`);

const results = [];
for (const persona of personas) {
  const loginResponse = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: persona.email, password }),
  });
  const login = await json(loginResponse);
  if (!loginResponse.ok || typeof login?.accessToken !== 'string') {
    throw new Error(`${persona.name} login failed with ${loginResponse.status}`);
  }
  if (login.mfaRequired === true) {
    throw new Error(`${persona.name} unexpectedly requires MFA in the UAT seed`);
  }

  const profileResponse = await fetch(`${apiBase}/me`, {
    headers: { authorization: `Bearer ${login.accessToken}` },
    cache: 'no-store',
  });
  const profile = await json(profileResponse);
  if (!profileResponse.ok || profile?.email !== persona.email) {
    throw new Error(`${persona.name} profile verification failed with ${profileResponse.status}`);
  }

  results.push({
    persona: persona.name,
    email: persona.email,
    roles: profile.tenant?.roles ?? [],
    passwordResetRequired: login.passwordResetRequired === true,
  });
}

const wrongPassword = await fetch(`${apiBase}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: personas[0].email, password: `${password}-wrong` }),
});
if (wrongPassword.status !== 401) {
  throw new Error(`Wrong-password check returned ${wrongPassword.status} instead of 401`);
}

process.stdout.write(
  `${JSON.stringify({ apiBase, personas: results, wrongPassword: 401 }, null, 2)}\n`,
);
