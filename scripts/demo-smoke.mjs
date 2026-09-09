/* global fetch, process */

const baseUrl = (process.env.CPF_UAT_WEB_URL ?? 'http://127.0.0.1:4300').replace(/\/$/, '');
const password = process.env.CPF_UAT_SHARED_PASSWORD ?? 'CPF-UAT-ChangeMe-2026!';

const journeys = [
  {
    name: 'Candidate',
    email: 'candidate.one@northstar.invalid',
    workspace: '/candidate',
    paths: [
      '/api/candidate/profile',
      '/api/candidate/applications',
      '/api/candidate/precheck',
      '/api/candidate/schedule',
      '/api/candidate/notices',
      '/api/candidate/attempt/11111111-0000-4000-8000-000000000300',
    ],
    actions: [
      {
        path: '/api/candidate/attempt/11111111-0000-4000-8000-000000000300',
        method: 'POST',
        body: { action: 'start' },
      },
    ],
  },
  {
    name: 'Reviewer',
    email: 'reviewer@northstar.invalid',
    workspace: '/review',
    paths: ['/api/review/assignments', '/api/review/profile', '/api/review/training'],
  },
  {
    name: 'Employer',
    email: 'admin@northstar.invalid',
    workspace: '/employer',
    paths: [
      '/api/employer/dashboard',
      '/api/employer/organization',
      '/api/employer/campaigns',
      '/api/employer/candidates',
      '/api/employer/invitations',
      '/api/employer/scheduling',
    ],
    actions: [
      {
        path: '/api/employer/candidates',
        method: 'POST',
        body: { displayName: 'UAT Candidate', campaignName: 'UAT Campaign' },
      },
    ],
  },
  {
    name: 'Platform admin',
    email: 'platform.admin@cpf-uat.invalid',
    workspace: '/admin',
    paths: ['/api/admin/dashboard', '/api/admin/tenants', '/api/admin/jobs'],
  },
  {
    name: 'Governance',
    email: 'governance@tenant-01.cpf-uat.invalid',
    workspace: '/governance',
    paths: [
      '/api/governance/ai-systems',
      '/api/governance/risks',
      '/api/governance/incidents',
      '/api/governance/oversight/ais_frontend_demo',
    ],
    actions: [
      {
        path: '/api/governance/risks',
        method: 'POST',
        body: {
          title: 'UAT control verification',
          riskLevel: 'medium',
          controls: 'Human approval and immutable evidence',
          residual: 'Low',
        },
      },
    ],
  },
  {
    name: 'Operations',
    email: 'operations@tenant-01.cpf-uat.invalid',
    workspace: '/operations',
    paths: ['/api/operations/dashboard', '/api/operations/security', '/api/operations/deliveries'],
    actions: [
      {
        path: '/api/operations/alerts/ops-alert-demo-1/acknowledge',
        method: 'POST',
      },
    ],
  },
  {
    name: 'Support',
    email: 'support@tenant-01.cpf-uat.invalid',
    workspace: '/support',
    paths: ['/api/support/queue', '/api/support/jit-access', '/api/support/cases/demo-uat-case'],
    actions: [
      {
        path: '/api/support/cases/demo-uat-case/status',
        method: 'POST',
        body: { status: 'in_progress' },
      },
      {
        path: '/api/support/cases/demo-uat-case/messages',
        method: 'POST',
        body: {
          content: 'UAT support reply confirms the synthetic workflow is operational.',
          internal: false,
        },
      },
    ],
  },
];

async function signIn(journey) {
  const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: journey.email,
      password,
      workspace: journey.workspace,
    }),
    redirect: 'manual',
  });
  if (!response.ok) {
    throw new Error(
      `${journey.name} sign-in failed with ${response.status}: ${await response.text()}`,
    );
  }
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
  if (!cookie) throw new Error(`${journey.name} sign-in did not issue a session cookie`);
  return cookie;
}

const failures = [];
for (const journey of journeys) {
  const cookie = await signIn(journey);
  process.stdout.write(`\n${journey.name}\n`);
  for (const path of journey.paths) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { cookie },
      redirect: 'manual',
    });
    const outcome = response.ok ? 'PASS' : 'FAIL';
    process.stdout.write(`  ${outcome} ${response.status} ${path}\n`);
    if (!response.ok) {
      const detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 300);
      failures.push(`${journey.name} ${path}: ${response.status} ${detail}`);
    }
  }
  for (const action of journey.actions ?? []) {
    const response = await fetch(`${baseUrl}${action.path}`, {
      method: action.method,
      headers: {
        cookie,
        ...(action.body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(action.body === undefined ? {} : { body: JSON.stringify(action.body) }),
      redirect: 'manual',
    });
    const outcome = response.ok ? 'PASS' : 'FAIL';
    process.stdout.write(`  ${outcome} ${response.status} ${action.method} ${action.path}\n`);
    if (!response.ok) {
      const detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 300);
      failures.push(
        `${journey.name} ${action.method} ${action.path}: ${response.status} ${detail}`,
      );
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`\nDemo smoke failures (${failures.length}):\n${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nAll database-backed UAT journeys passed.\n');
}
