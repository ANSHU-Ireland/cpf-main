import 'server-only';

const API_BASE_URL = process.env.CPF_API_BASE_URL ?? 'http://127.0.0.1:3300';
const PERSISTENCE_ENABLED = process.env.CPF_DEMO_PERSISTENCE === 'true';

const DEMO_ATTEMPT_ID = '11111111-0000-4000-8000-000000000300';
const DEMO_ASSIGNMENT_ID = '11111111-0000-4000-8000-000000000321';

const TASK_IDS: Readonly<Record<string, string>> = {
  task_doc: '11111111-0000-4000-8000-000000000133',
  task_applied: '11111111-0000-4000-8000-000000000134',
  task_code: '11111111-0000-4000-8000-000000000135',
  task_sheet: '11111111-0000-4000-8000-000000000136',
  task_playbook: '11111111-0000-4000-8000-000000000137',
};

const CRITERION_IDS: Readonly<Record<string, string>> = {
  cri_correctness: '11111111-0000-4000-8000-000000000111',
  cri_design: '11111111-0000-4000-8000-000000000112',
  cri_communication: '11111111-0000-4000-8000-000000000113',
  cri_risk: '11111111-0000-4000-8000-000000000114',
  cri_delivery: '11111111-0000-4000-8000-000000000115',
};

export class DemoPersistenceError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'DemoPersistenceError';
    this.status = status;
  }
}

async function persist(path: string, method: 'POST' | 'PUT', body?: unknown): Promise<void> {
  if (!PERSISTENCE_ENABLED) return;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new DemoPersistenceError(503, 'The PostgreSQL demo service is unavailable.');
  }
  if (!response.ok) {
    let detail = `Persistence request failed (${String(response.status)}).`;
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      detail = problem.detail ?? problem.title ?? detail;
    } catch {
      // Preserve the transport fallback for non-JSON errors.
    }
    throw new DemoPersistenceError(response.status, detail);
  }
}

function mappedId(map: Readonly<Record<string, string>>, id: string, label: string): string {
  const mapped = map[id];
  if (mapped === undefined)
    throw new DemoPersistenceError(404, `${label} is not in the demo fixture.`);
  return mapped;
}

export const demoPersistence = {
  enabled: PERSISTENCE_ENABLED,

  startAttempt: (): Promise<void> => persist(`/attempts/${DEMO_ATTEMPT_ID}/start`, 'POST', {}),

  submitAttempt: (): Promise<void> => persist(`/attempts/${DEMO_ATTEMPT_ID}/submit`, 'POST', {}),

  saveTask: (taskId: string, response: string): Promise<void> =>
    persist(`/attempts/${DEMO_ATTEMPT_ID}/responses/${mappedId(TASK_IDS, taskId, 'Task')}`, 'PUT', {
      value: response,
    }),

  setTaskFlag: (taskId: string, flagged: boolean): Promise<void> =>
    persist(
      `/attempts/${DEMO_ATTEMPT_ID}/item-flags/${mappedId(TASK_IDS, taskId, 'Task')}`,
      'PUT',
      { flagged },
    ),

  startBreak: (): Promise<void> =>
    persist(`/attempts/${DEMO_ATTEMPT_ID}/breaks`, 'POST', {
      reason: 'Candidate requested a scheduled break.',
    }),

  endBreak: (): Promise<void> => persist(`/attempts/${DEMO_ATTEMPT_ID}/start`, 'POST', {}),

  saveCriterion: (
    criterionId: string,
    score: number,
    rationale: string,
    evidenceLink: string,
    insufficientEvidence: boolean,
  ): Promise<void> =>
    persist(`/review-assignments/${DEMO_ASSIGNMENT_ID}/scorecard`, 'PUT', {
      criterion: {
        criterionId: mappedId(CRITERION_IDS, criterionId, 'Criterion'),
        humanScore: insufficientEvidence ? null : score,
        confidence: insufficientEvidence ? null : score >= 4 ? 0.9 : score >= 3 ? 0.8 : 0.65,
        insufficientEvidence,
        evidenceLinks: insufficientEvidence ? [] : [{ label: evidenceLink }],
        reviewerComment: rationale,
      },
    }),
};
