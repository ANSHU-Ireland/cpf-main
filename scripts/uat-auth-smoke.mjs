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
let governanceAccessToken;
let auditorAccessToken;
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
  if (persona.name === 'governance') governanceAccessToken = login.accessToken;
  if (persona.name === 'auditor') auditorAccessToken = login.accessToken;

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

if (typeof governanceAccessToken !== 'string') {
  throw new Error('Governance session was not captured');
}
const governanceDocumentPaths = [
  '/governance/ai-literacy',
  '/governance/data-use-register',
  '/governance/datasets',
  '/governance/impact-assessments',
  '/governance/post-market-plans',
  '/governance/post-market-signals',
  '/governance/qms-documents',
  '/governance/technical-documents',
  '/governance/vendor-evidence',
];
const governanceDocuments = {};
for (const path of governanceDocumentPaths) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { authorization: `Bearer ${governanceAccessToken}` },
    cache: 'no-store',
  });
  const body = await json(response);
  if (!response.ok || !Array.isArray(body?.items) || body.items.length === 0) {
    throw new Error(`${path} did not return seeded canonical documents (${response.status})`);
  }
  governanceDocuments[path] = body.items.length;
}

if (typeof auditorAccessToken !== 'string') {
  throw new Error('Auditor session was not captured');
}
const collectionsResponse = await fetch(`${apiBase}/audit/evidence-collections`, {
  headers: { authorization: `Bearer ${auditorAccessToken}` },
  cache: 'no-store',
});
const collections = await json(collectionsResponse);
if (!collectionsResponse.ok || !Array.isArray(collections?.items) || collections.items.length < 4) {
  throw new Error(
    `/audit/evidence-collections did not return the seeded collections (${collectionsResponse.status})`,
  );
}
const requirementIds = [
  ...new Set(collections.items.flatMap((collection) => collection.requirementIds ?? [])),
];
if (requirementIds.length < 12) {
  throw new Error(`Seeded evidence collections link only ${requirementIds.length} requirements`);
}
for (const requirementId of requirementIds) {
  const response = await fetch(`${apiBase}/audit/traceability/${requirementId}`, {
    headers: { authorization: `Bearer ${auditorAccessToken}` },
    cache: 'no-store',
  });
  const row = await json(response);
  if (!response.ok || row?.id !== requirementId || typeof row?.requirementId !== 'string') {
    throw new Error(`Traceability ${requirementId} failed with ${response.status}`);
  }
}
const auditEvidence = {
  collections: collections.items.length,
  requirements: requirementIds.length,
  evidenceItems: collections.items.reduce(
    (total, collection) => total + Number(collection.itemCount ?? 0),
    0,
  ),
};

const wrongPassword = await fetch(`${apiBase}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: personas[0].email, password: `${password}-wrong` }),
});
if (wrongPassword.status !== 401) {
  throw new Error(`Wrong-password check returned ${wrongPassword.status} instead of 401`);
}

process.stdout.write(
  `${JSON.stringify(
    { apiBase, personas: results, governanceDocuments, auditEvidence, wrongPassword: 401 },
    null,
    2,
  )}\n`,
);
