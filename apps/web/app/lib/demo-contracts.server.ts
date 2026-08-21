const DEMO_SYSTEM_ID = 'ais_frontend_demo';
const DEMO_TIME = '2026-08-21T14:30:00.000Z';

type DemoRecord = Record<string, unknown>;

const candidates: DemoRecord[] = [
  {
    id: '11111111-0000-4000-8000-000000000210',
    reference: 'CND-8D42',
    displayName: 'Jamie Patel',
    status: 'active',
    campaignName: 'Warehouse Systems Engineers — Autumn 2026',
    applicationCount: 1,
  },
  {
    id: '11111111-0000-4000-8000-000000000213',
    reference: 'CND-4C18',
    displayName: 'Taylor Candidate',
    status: 'invited',
    campaignName: 'Data Analysts — Rolling',
    applicationCount: 1,
  },
];

const invitations: DemoRecord[] = [
  {
    id: '11111111-0000-4000-8000-000000000212',
    email: 'candidate.one@northstar.invalid',
    campaignName: 'Warehouse Systems Engineers — Autumn 2026',
    status: 'accepted',
    sentAt: '2026-08-18T09:00:00.000Z',
  },
  {
    id: '11111111-0000-4000-8000-000000000215',
    email: 'taylor@example.test',
    campaignName: 'Data Analysts — Rolling',
    status: 'sent',
    sentAt: '2026-08-20T10:30:00.000Z',
  },
];

const risks: DemoRecord[] = [
  {
    id: 'risk-demo-1',
    title: 'Bias in candidate scoring',
    riskLevel: 'high',
    controls: 'Bias testing, calibrated rubrics and mandatory human oversight',
    residual: 'Medium',
    status: 'ready',
    owner: 'Risk Owner',
  },
  {
    id: 'risk-demo-2',
    title: 'Candidate data exposure',
    riskLevel: 'critical',
    controls: 'Encryption, least privilege and chained audit evidence',
    residual: 'Low',
    status: 'complete',
    owner: 'DPO',
  },
];

const incidents: DemoRecord[] = [
  {
    id: 'incident-demo-1',
    title: 'Incorrect progression decision issued',
    severity: 'serious',
    contained: true,
    notified: true,
    status: 'complete',
    owner: 'Incident Manager',
    occurredAt: '2026-08-11T10:00:00.000Z',
  },
];

const employerFixtures = {
  scheduling: collection([
    {
      id: 'window-demo-1',
      label: 'Tuesday morning — Dublin',
      startsAt: '2026-08-25T09:00:00.000Z',
      capacity: 12,
      booked: 7,
      status: 'open',
    },
    {
      id: 'window-demo-2',
      label: 'Thursday afternoon — remote',
      startsAt: '2026-08-27T13:00:00.000Z',
      capacity: 8,
      booked: 8,
      status: 'full',
    },
  ]),
  reviewers: collection([
    {
      id: '11111111-0000-4000-8000-000000000011',
      name: 'Avery Chen',
      disciplines: ['Engineering', 'Structured interviewing'],
      status: 'active',
      activeAssignments: 1,
    },
    {
      id: 'reviewer-demo-2',
      name: 'Noah Byrne',
      disciplines: ['Data analysis'],
      status: 'training',
      activeAssignments: 0,
    },
  ]),
  assignments: collection([
    {
      id: '11111111-0000-4000-8000-000000000321',
      candidateRef: 'CND-8D42',
      campaignName: 'Warehouse Systems Engineers — Autumn 2026',
      reviewerName: 'Avery Chen',
      status: 'in_review',
    },
    {
      id: 'assignment-demo-2',
      candidateRef: 'CND-4C18',
      campaignName: 'Data Analysts — Rolling',
      reviewerName: null,
      status: 'unassigned',
    },
  ]),
  reports: collection([
    {
      id: 'report-demo-1',
      name: 'Northstar campaign fairness report',
      kind: 'campaign_governance',
      status: 'ready',
      generatedAt: '2026-08-21T13:20:00.000Z',
    },
  ]),
  preflight: collection([
    {
      id: 'preflight-demo-1',
      label: 'Rubric approved',
      severity: 'ready',
      detail: 'A validated rubric version is bound to the campaign.',
      resolved: true,
    },
    {
      id: 'preflight-demo-2',
      label: 'Reviewer coverage',
      severity: 'warning',
      detail: 'One additional calibrated reviewer is recommended.',
      resolved: false,
    },
  ]),
  decision: {
    applicationId: '11111111-0000-4000-8000-000000000220',
    decisionId: 'decision-demo-1',
    candidateRef: 'CND-8D42',
    campaignName: 'Warehouse Systems Engineers — Autumn 2026',
    outcome: 'progress',
    rationale: 'The evidence meets the published rubric and was independently reviewed.',
    evidenceLinks: ['Scorecard', 'Integrity review', 'Accommodation check'],
    reviewComplete: true,
    status: 'awaiting_approval',
  },
  approval: {
    applicationId: '11111111-0000-4000-8000-000000000220',
    decisionId: 'decision-demo-1',
    candidateRef: 'CND-8D42',
    campaignName: 'Warehouse Systems Engineers — Autumn 2026',
    outcome: 'progress',
    rationale: 'The evidence meets the published rubric and was independently reviewed.',
    evidenceLinks: ['Scorecard', 'Integrity review', 'Accommodation check'],
    draftedBy: 'Morgan Lee',
    status: 'awaiting_approval',
    approver: 'Priya Shah',
    approvedAt: null,
    issuedAt: null,
    returnRationale: null,
  },
};

const adminFixtures = {
  grants: collection([
    {
      id: 'grant-demo-1',
      requester: 'Morgan Lee',
      scope: 'candidate_data',
      justification: 'Resolve synthetic support case SUP-2457',
      status: 'active',
      expiresAt: '2026-08-21T16:15:00.000Z',
      approver: 'Priya Shah',
    },
  ]),
  staff: collection([
    {
      id: '11111111-0000-4000-8000-000000000010',
      name: 'Morgan Lee',
      email: 'admin@northstar.invalid',
      role: 'Platform staff',
      status: 'active',
    },
    {
      id: '11111111-0000-4000-8000-000000000011',
      name: 'Avery Chen',
      email: 'reviewer@northstar.invalid',
      role: 'Reviewer',
      status: 'active',
    },
  ]),
  assessment: {
    id: 'assessment-demo-1',
    name: 'Northstar Structured Engineering Assessment',
    status: 'active',
    owner: 'Assessment Governance',
    reference: 'ASM-NORTHSTAR-01',
    riskTier: 'high',
    versions: [
      {
        id: 'assessment-version-demo-1',
        assessmentId: 'assessment-demo-1',
        label: '2026.3',
        status: 'active',
        effectiveDate: '2026-08-01',
        rationale: 'Validated for the autumn warehouse systems campaign.',
        validationResolved: true,
      },
    ],
  },
};

const governanceFixtures: Record<string, unknown> = {
  classification: {
    systemId: DEMO_SYSTEM_ID,
    role: 'Provider and deployer',
    intendedPurpose: 'Human-led employment candidate assessment',
    classification: 'High-risk — EU AI Act Annex III',
    reasoning: 'The system supports recruitment decisions with mandatory human authority.',
    resolved: true,
  },
  datasets: collection([
    {
      id: 'dataset-demo-1',
      name: 'Synthetic Assessment Corpus 2026-Q1',
      provenance: 'Controlled synthetic generation and expert validation',
      lawfulBasis: 'Legitimate interests — employment assessment',
      representativeness: 'Balanced across age, gender and region cohorts',
      status: 'complete',
      owner: 'Data Steward',
      updatedAt: DEMO_TIME,
    },
  ]),
  technicalDocs: collection([
    {
      id: 'tech-doc-demo-1',
      systemId: DEMO_SYSTEM_ID,
      version: 'v2.0',
      status: 'ready',
      owner: 'Compliance',
      reference: 'TDC-NORTHSTAR-20',
      updatedAt: DEMO_TIME,
    },
  ]),
  qms: collection([
    {
      id: 'qms-demo-1',
      title: 'Assessment version approval',
      policy: 'Every version requires human validation before activation.',
      approvedBy: 'Compliance',
      status: 'complete',
      owner: 'Quality Manager',
      updatedAt: DEMO_TIME,
    },
  ]),
  dataUse: collection([
    {
      id: 'data-use-demo-1',
      purpose: 'Employment candidate assessment',
      lawfulBasis: 'Legitimate interests',
      categories: 'Candidate responses and assessment metadata',
      recipients: 'Northstar hiring team and authorised reviewers',
      retention: 'Three years after the decision',
      status: 'ready',
      owner: 'DPO',
    },
  ]),
  impact: {
    systemId: DEMO_SYSTEM_ID,
    assessmentType: 'DPIA',
    outcome: 'Approved with controls',
    rationale: 'Residual privacy risk is acceptable with the documented controls.',
    resolved: true,
  },
  oversight: {
    systemId: DEMO_SYSTEM_ID,
    authority: 'Authorised Northstar hiring manager',
    competency: 'Annual reviewer and AI literacy certification',
    stoppingRules: 'Pause on integrity flags, accommodation conflicts or model drift.',
    outcome: 'Approved',
    rationale: 'Humans retain final authority and can stop every workflow.',
    resolved: true,
  },
  deployerInstructions: collection([
    {
      id: 'deployer-demo-1',
      systemId: DEMO_SYSTEM_ID,
      version: 'v1.2',
      limitations: 'No automated employment decisions',
      oversight: 'An authorised reviewer must approve every outcome',
      status: 'ready',
      owner: 'Compliance',
      reference: 'DPI-NORTHSTAR-12',
    },
  ]),
  aiLiteracy: collection([
    {
      id: 'literacy-demo-1',
      role: 'Reviewer',
      trainingModule: 'AI Governance Essentials',
      assignee: 'Avery Chen',
      completedAt: '2026-07-20T09:00:00.000Z',
      expiresAt: '2027-07-20T09:00:00.000Z',
      status: 'complete',
    },
  ]),
  conformity: {
    systemId: DEMO_SYSTEM_ID,
    requirements: 'Risk management, data governance, transparency and human oversight',
    tests: 'Bias, robustness, security and traceability suites passed',
    gaps: 'No blocking gaps',
    outcome: 'Conformant',
    rationale: 'Evidence pack reviewed and approved by Compliance.',
    resolved: true,
  },
  marketAccess: collection([
    {
      id: 'market-demo-1',
      systemId: DEMO_SYSTEM_ID,
      accessType: 'registration',
      completedAt: '2026-08-10T11:00:00.000Z',
      evidence: 'Synthetic EU database registration confirmation',
      status: 'complete',
      owner: 'Compliance',
    },
  ]),
  postMarket: {
    systemId: DEMO_SYSTEM_ID,
    metrics: 'Completion, adverse impact, reviewer agreement and incidents',
    thresholds: 'Pause if adverse impact ratio drops below 0.8',
    reviewCadence: 'Monthly and after every material change',
    outcome: 'Approved',
    rationale: 'Metrics cover safety, fairness and operational performance.',
    resolved: true,
  },
  signals: {
    readyNow: 1,
    needsAttention: 1,
    inProgress: 0,
    signals: [
      {
        id: 'signal-demo-1',
        type: 'drift',
        priority: 'medium',
        description: 'Synthetic response-latency drift under review',
        status: 'attention',
        owner: 'Operations',
        detectedAt: DEMO_TIME,
      },
    ],
    recentActivity: [{ event: 'Monthly signal review completed', timestamp: DEMO_TIME }],
  },
  vendors: collection([
    {
      id: 'vendor-demo-1',
      vendor: 'Northstar Model Hosting',
      obligation: 'Annual security and safety evidence',
      evidence: 'Certificate valid through 2027-03-01',
      expiresAt: '2027-03-01T00:00:00.000Z',
      status: 'ready',
      owner: 'Vendor Manager',
    },
  ]),
  changes: collection([
    {
      id: 'change-demo-1',
      title: 'Update assessment rubric',
      significance: 'major',
      affectedControls: 'Validation, reviewer calibration and candidate notice',
      outcome: 'Approved',
      rationale: 'Validation evidence confirms no material risk increase.',
      resolved: true,
      status: 'complete',
      owner: 'Change Authority',
    },
  ]),
  evidence: collection([
    {
      id: 'evidence-demo-1',
      title: 'Northstar Q3 compliance evidence',
      purpose: 'Demonstrate end-to-end control operation',
      custodian: 'Morgan Lee',
      sealed: true,
      chainOfCustody: [{ actor: 'Morgan Lee', action: 'Collection sealed', timestamp: DEMO_TIME }],
      status: 'complete',
      createdAt: DEMO_TIME,
    },
  ]),
  traceability: collection([
    {
      requirementId: 'FR-GOV-04',
      description: 'Maintain AI risk and control evidence',
      controls: ['Risk register', 'Human approval', 'Audit chain'],
      evidence: ['evidence-demo-1'],
      status: 'complete',
    },
  ]),
};

function collection(items: readonly unknown[]): { items: readonly unknown[]; total: number } {
  return { items, total: items.length };
}

function demoId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function addDemoCandidate(displayName: string, campaignName: string): DemoRecord {
  const record = {
    id: demoId('candidate'),
    reference: `CND-${candidates.length + 1}`,
    displayName,
    status: 'invited',
    campaignName,
    applicationCount: 0,
  };
  candidates.unshift(record);
  return record;
}

export function addDemoInvitation(email: string, campaignName: string): DemoRecord {
  const record = {
    id: demoId('invitation'),
    email,
    campaignName,
    status: 'sent',
    sentAt: new Date().toISOString(),
  };
  invitations.unshift(record);
  return record;
}

export function addDemoRisk(
  title: string,
  riskLevel: string,
  controls: string,
  residual: string,
): DemoRecord {
  const record = {
    id: demoId('risk'),
    title,
    riskLevel,
    controls,
    residual,
    status: 'draft',
    owner: 'Morgan Lee',
  };
  risks.unshift(record);
  return record;
}

export function addDemoIncident(
  title: string,
  severity: string,
  contained: boolean,
  notified: boolean,
): DemoRecord {
  const record = {
    id: demoId('incident'),
    title,
    severity,
    contained,
    notified,
    status: 'draft',
    owner: 'Morgan Lee',
    occurredAt: new Date().toISOString(),
  };
  incidents.unshift(record);
  return record;
}

export function functionalDemoEnabled(): boolean {
  return process.env.CPF_DEMO_MODE === 'true';
}

export async function readDemoObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function demoValidationResponse(detail: string): Response {
  return Response.json({ title: 'Invalid demo input', status: 422, detail }, { status: 422 });
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

function currentSystemId(): string {
  return DEMO_SYSTEM_ID;
}

/**
 * Read-only projections for local demo routes whose production OpenAPI contract is still pending.
 * This module is reached only when CPF_DEMO_MODE=true; production continues to return the
 * documented fail-closed contract-gap response.
 */
export function demoContractReadResponse(request: Request): Response | null {
  if (request.method.toUpperCase() !== 'GET') return null;

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');
  const systemId = url.searchParams.get('systemId') ?? currentSystemId();

  switch (path) {
    case '/employer/candidates':
      return json(collection(candidates));
    case '/employer/invitations':
      return json(collection(invitations));
    case '/employer/scheduling':
      return json(employerFixtures.scheduling);
    case '/employer/reviewers':
      return json(employerFixtures.reviewers);
    case '/employer/assignments':
      return json(employerFixtures.assignments);
    case '/employer/reports':
      return json(employerFixtures.reports);
    case '/employer/applications/demo/decision':
      return json(employerFixtures.decision);
    case '/employer/applications/demo/approval':
      return json(employerFixtures.approval);
    case '/admin/privileged-access':
      return json(adminFixtures.grants);
    case '/governance/classifications':
      return json({
        ...(governanceFixtures.classification as DemoRecord),
        systemId,
      });
    case '/governance/risks':
      return json(collection(risks));
    case '/governance/datasets':
      return json(governanceFixtures.datasets);
    case '/governance/technical-docs':
      return json(governanceFixtures.technicalDocs);
    case '/governance/qms':
      return json(governanceFixtures.qms);
    case '/governance/data-use':
      return json(governanceFixtures.dataUse);
    case '/governance/impact-assessments':
      return json({ ...(governanceFixtures.impact as DemoRecord), systemId });
    case '/governance/oversight':
      return json({ ...(governanceFixtures.oversight as DemoRecord), systemId });
    case '/governance/deployer-instructions':
      return json(governanceFixtures.deployerInstructions);
    case '/governance/ai-literacy':
      return json(governanceFixtures.aiLiteracy);
    case '/governance/conformity':
      return json({ ...(governanceFixtures.conformity as DemoRecord), systemId });
    case '/governance/market-access':
      return json(governanceFixtures.marketAccess);
    case '/governance/post-market':
      return json({ ...(governanceFixtures.postMarket as DemoRecord), systemId });
    case '/governance/signals':
      return json(governanceFixtures.signals);
    case '/governance/incidents':
      return json(collection(incidents));
    case '/governance/vendors':
      return json(governanceFixtures.vendors);
    case '/governance/changes':
      return json(governanceFixtures.changes);
    case '/audit/evidence':
      return json(governanceFixtures.evidence);
    case '/audit/traceability':
      return json(governanceFixtures.traceability);
    case '/support/jit-access':
      return json({
        sessions: [
          {
            id: 'jit-demo-1',
            grantedTo: 'morgan.lee@cpf.invalid',
            scope: 'candidate_data',
            justification: 'Resolve synthetic support case SUP-2457',
            grantedAt: '2026-08-21T14:15:00.000Z',
            expiresAt: '2026-08-21T16:15:00.000Z',
            status: 'active',
            actions: [
              {
                id: 'jit-action-demo-1',
                action: 'Viewed synthetic candidate profile',
                timestamp: '2026-08-21T14:20:00.000Z',
                outcome: 'Success',
              },
            ],
          },
        ],
      });
    case '/operations/dashboard':
      return json({
        metrics: [
          { label: 'Active assessments', value: '4', trend: '+1', tone: 'success' },
          { label: 'System uptime', value: '99.98%', tone: 'success' },
          { label: 'Average response time', value: '142ms', trend: '-8ms', tone: 'success' },
          { label: 'Support queue', value: '3', trend: '-2', tone: 'warning' },
        ],
        alerts: [
          {
            id: 'ops-alert-demo-1',
            severity: 'warning',
            message: 'Synthetic delivery retry is awaiting operator review.',
            timestamp: '2026-08-21T14:30:00.000Z',
            acknowledged: false,
          },
        ],
        recentActivity: [
          {
            id: 'ops-activity-demo-1',
            description: 'Northstar assessment campaign activated',
            timestamp: '2026-08-21T13:00:00.000Z',
          },
          {
            id: 'ops-activity-demo-2',
            description: 'Three candidate submissions entered human review',
            timestamp: '2026-08-21T13:45:00.000Z',
          },
        ],
      });
    case '/operations/security':
      return json({ incidents: [], killSwitch: { enabled: false } });
    case '/operations/deliveries':
      return json({
        items: [
          {
            id: 'delivery-demo-1',
            deliveryType: 'export',
            destination: 'SFTP /northstar/exports',
            status: 'delivered',
            recordCount: 45,
            initiatedAt: '2026-08-21T12:00:00.000Z',
            completedAt: '2026-08-21T12:03:00.000Z',
            retryCount: 0,
          },
          {
            id: 'delivery-demo-2',
            deliveryType: 'webhook',
            destination: 'Northstar ATS assessment-complete webhook',
            status: 'failed',
            recordCount: 12,
            initiatedAt: '2026-08-21T14:10:00.000Z',
            errorMessage: 'Synthetic timeout for retry demonstration',
            retryCount: 2,
          },
        ],
        total: 2,
      });
    default:
      break;
  }

  const campaignPreflight = /^\/employer\/campaigns\/[^/]+\/preflight$/.exec(path);
  if (campaignPreflight !== null) return json(employerFixtures.preflight);

  const decision = /^\/employer\/applications\/[^/]+\/decision$/.exec(path);
  if (decision !== null) return json(employerFixtures.decision);

  const approval = /^\/employer\/applications\/[^/]+\/approval$/.exec(path);
  if (approval !== null) return json(employerFixtures.approval);

  const assessment = /^\/admin\/assessments\/([^/]+)$/.exec(path);
  if (assessment?.[1] !== undefined)
    return json({ ...adminFixtures.assessment, id: assessment[1] });

  const tenantStaff = /^\/admin\/tenants\/[^/]+\/staff$/.exec(path);
  if (tenantStaff !== null) return json(adminFixtures.staff);

  const classification = /^\/governance\/classifications\/([^/]+)$/.exec(path);
  if (classification?.[1] !== undefined)
    return json({
      ...(governanceFixtures.classification as DemoRecord),
      systemId: classification[1],
    });

  const impact = /^\/governance\/impact-assessments\/([^/]+)$/.exec(path);
  if (impact?.[1] !== undefined)
    return json({ ...(governanceFixtures.impact as DemoRecord), systemId: impact[1] });

  const oversight = /^\/governance\/oversight\/([^/]+)$/.exec(path);
  if (oversight?.[1] !== undefined)
    return json({ ...(governanceFixtures.oversight as DemoRecord), systemId: oversight[1] });

  const conformity = /^\/governance\/conformity\/([^/]+)$/.exec(path);
  if (conformity?.[1] !== undefined)
    return json({ ...(governanceFixtures.conformity as DemoRecord), systemId: conformity[1] });

  const postMarket = /^\/governance\/post-market\/([^/]+)$/.exec(path);
  if (postMarket?.[1] !== undefined)
    return json({ ...(governanceFixtures.postMarket as DemoRecord), systemId: postMarket[1] });

  const change = /^\/governance\/changes\/([^/]+)$/.exec(path);
  if (change?.[1] !== undefined) {
    const changes = governanceFixtures.changes as { items: readonly DemoRecord[] };
    const item = changes.items.find((entry) => entry['id'] === change[1]);
    return json(item ?? null, item === undefined ? 404 : 200);
  }

  return null;
}
