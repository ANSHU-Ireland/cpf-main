import process from 'node:process';

/* global fetch */

const apiBase = (process.env.CPF_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const password = process.env.CPF_UAT_SHARED_PASSWORD ?? 'CPF-UAT-ChangeMe-2026!';
const email = process.env.CPF_UAT_AUDITOR_EMAIL ?? 'auditor@tenant-01.cpf-uat.invalid';

async function body(response) {
  const text = await response.text();
  return text === '' ? null : JSON.parse(text);
}

const loginResponse = await fetch(`${apiBase}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const login = await body(loginResponse);
if (!loginResponse.ok || typeof login?.accessToken !== 'string') {
  throw new Error(`Auditor login failed with ${loginResponse.status}`);
}
const authorization = `Bearer ${login.accessToken}`;
const title = `Isolated audit mutation ${new Date().toISOString()}`;
const createResponse = await fetch(`${apiBase}/audit/evidence-collections`, {
  method: 'POST',
  headers: {
    authorization,
    'content-type': 'application/json',
    'idempotency-key': `uat-audit-${Date.now().toString()}`,
  },
  body: JSON.stringify({
    reason: 'Exercise the canonical evidence-collection transaction in isolated UAT.',
    expectedVersion: 0,
    data: {
      title,
      purpose: 'Verify persistence, custody, audit and outbox behavior.',
      framework: 'CPF UAT',
    },
  }),
});
const created = await body(createResponse);
if (!createResponse.ok || typeof created?.id !== 'string') {
  throw new Error(`Evidence collection create failed with ${createResponse.status}`);
}
if (created.itemCount !== 0 || created.chainOfCustody?.[0]?.action !== 'created') {
  throw new Error('Created collection did not return its canonical custody projection');
}

const listResponse = await fetch(`${apiBase}/audit/evidence-collections`, {
  headers: { authorization },
  cache: 'no-store',
});
const listed = await body(listResponse);
if (!listResponse.ok || !listed?.items?.some((item) => item.id === created.id)) {
  throw new Error('Created collection did not rehydrate from PostgreSQL');
}

process.stdout.write(
  `${JSON.stringify(
    {
      apiBase,
      collectionId: created.id,
      status: created.status,
      custodian: created.custodian,
      custodyEvents: created.chainOfCustody.length,
      rehydrated: true,
    },
    null,
    2,
  )}\n`,
);
