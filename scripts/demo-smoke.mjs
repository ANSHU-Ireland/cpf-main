/* global fetch, process */

const baseUrl = (process.env.CPF_DEMO_WEB_URL ?? 'http://127.0.0.1:4300').replace(/\/$/, '');
const password = 'CPF-DEMO-2026';

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
    ],
  },
  {
    name: 'Platform admin',
    email: 'admin@northstar.invalid',
    workspace: '/admin',
    paths: ['/api/admin/dashboard', '/api/admin/tenants', '/api/admin/jobs'],
  },
  {
    name: 'Governance',
    email: 'admin@northstar.invalid',
    workspace: '/governance',
    paths: ['/api/governance/ai-systems', '/api/governance/risks', '/api/governance/incidents'],
  },
  {
    name: 'Operations',
    email: 'admin@northstar.invalid',
    workspace: '/operations',
    paths: ['/api/operations/dashboard', '/api/operations/deliveries'],
  },
  {
    name: 'Support',
    email: 'admin@northstar.invalid',
    workspace: '/support',
    paths: ['/api/support/queue', '/api/support/jit-access'],
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
}

if (failures.length > 0) {
  process.stderr.write(`\nDemo smoke failures (${failures.length}):\n${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nAll functional demo journeys passed.\n');
}
