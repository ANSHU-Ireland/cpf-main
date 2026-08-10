import { describe, it, expect } from 'vitest';
import {
  getAttempt,
  startAttempt,
  submitAttempt,
  saveAttemptResponse,
  flagAttemptItem,
  addAttemptPrecheck,
  startAttemptBreak,
  recordAttemptIncident,
  addAttemptArtifact,
  deleteAttemptArtifact,
  postAttemptAiMessage,
  resetAttemptAi,
  executeAttemptPlugin,
  parseAttemptId,
  parseItemId,
  parseArtifactId,
  parsePluginCode,
  parseAttemptResponse,
  parseAttemptItemFlag,
  parseAttemptArtifact,
  parseAttemptBreak,
  parseAttemptIncident,
  parseAttemptPrecheck,
  parseAttemptAiMessage,
  parseAttemptPluginExecute,
  type AttemptRepository,
  type AttemptRecord,
  type AttemptSessionRecord,
  type AttemptResponseRecord,
  type AttemptItemFlagRecord,
  type AttemptArtifactRecord,
  type AttemptBreakRecord,
  type AttemptIncidentRecord,
  type AttemptPrecheckRecord,
  type AttemptAiMessageRecord,
  type AttemptPluginExecutionRecord,
} from './attempts.js';
import type { Actor } from './types.js';

const admin: Actor = { userId: 'u1', tenantId: 't1', roles: ['employer_admin'] };
const noRole: Actor = { userId: 'u2', tenantId: 't1', roles: ['viewer'] };
const ID = '11111111-1111-1111-1111-111111111111';
const ITEM = '22222222-2222-2222-2222-222222222222';
const ART = '33333333-3333-3333-3333-333333333333';

const attempt: AttemptRecord = {
  id: ID,
  applicationId: ID,
  assessmentVersionId: ID,
  status: 'in_progress',
  startedAt: '2026-01-01T00:00:00.000Z',
  submittedAt: null,
};
const attemptSession: AttemptSessionRecord = {
  ...attempt,
  assessmentTitle: 'Senior Frontend Engineer assessment',
  remainingSeconds: 3600,
  rowVersion: 1,
  serverNow: '2026-08-10T16:00:00.000Z',
  deadlineAt: '2026-08-10T17:00:00.000Z',
  sections: [],
  tasks: [],
  activeItemId: null,
  receiptRef: null,
};
const response: AttemptResponseRecord = { attemptId: ID, itemId: ITEM, value: 42, savedAt: '' };
const flag: AttemptItemFlagRecord = { attemptId: ID, itemId: ITEM, flagged: true };
const artifact: AttemptArtifactRecord = {
  id: ART,
  attemptId: ID,
  kind: 'file',
  uri: 's3://x',
  createdAt: '',
};
const brk: AttemptBreakRecord = { id: 'b1', attemptId: ID, reason: 'restroom', startedAt: '' };
const incident: AttemptIncidentRecord = {
  id: 'i1',
  attemptId: ID,
  incidentType: 'focus_loss',
  detail: null,
  recordedAt: '',
};
const precheck: AttemptPrecheckRecord = { attemptId: ID, passed: true, checks: { camera: true } };
const aiMessage: AttemptAiMessageRecord = {
  id: 'm1',
  attemptId: ID,
  role: 'assistant',
  content: 'hi',
  createdAt: '',
};
const execution: AttemptPluginExecutionRecord = {
  id: 'e1',
  attemptId: ID,
  pluginCode: 'com.acme.run',
  status: 'ok',
  output: {},
};

function repo(overrides: Partial<AttemptRepository> = {}): AttemptRepository {
  return {
    getAttempt: () => Promise.resolve(attemptSession),
    startAttempt: () => Promise.resolve(attempt),
    submitAttempt: () => Promise.resolve({ ...attempt, status: 'submitted' }),
    saveResponse: () => Promise.resolve(response),
    flagItem: () => Promise.resolve(flag),
    addPrecheck: () => Promise.resolve(precheck),
    startBreak: () => Promise.resolve(brk),
    recordIncident: () => Promise.resolve(incident),
    addArtifact: () => Promise.resolve(artifact),
    deleteArtifact: () => Promise.resolve(true),
    postAiMessage: () => Promise.resolve(aiMessage),
    resetAi: () => Promise.resolve(attempt),
    executePlugin: () => Promise.resolve(execution),
    ...overrides,
  };
}

function deps(overrides: Partial<AttemptRepository> = {}) {
  return { repository: repo(overrides) };
}

describe('getAttempt', () => {
  it('reads for an admin', async () => expect((await getAttempt(deps(), admin, ID)).ok).toBe(true));
  it('denies a viewer', async () => {
    const r = await getAttempt(deps(), noRole, ID);
    expect(r.ok === false && r.status).toBe(403);
  });
  it('404 when missing', async () => {
    const r = await getAttempt(deps({ getAttempt: () => Promise.resolve(null) }), admin, ID);
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('parsers', () => {
  it('parseAttemptId', () => {
    expect(parseAttemptId(ID)).toBe(ID);
    expect(parseAttemptId('nope')).toBeNull();
  });
  it('parseItemId / parseArtifactId', () => {
    expect(parseItemId(ITEM)).toBe(ITEM);
    expect(parseArtifactId(ART)).toBe(ART);
    expect(parseItemId('x')).toBeNull();
  });
  it('parsePluginCode', () => {
    expect(parsePluginCode('com.acme.run')).toBe('com.acme.run');
    expect(parsePluginCode('BAD CODE')).toBeNull();
  });
  it('parseAttemptResponse', () => {
    expect(parseAttemptResponse({ value: 1 }).ok).toBe(true);
    expect(parseAttemptResponse({}).ok).toBe(false);
  });
  it('parseAttemptItemFlag', () => {
    expect(parseAttemptItemFlag({ flagged: true }).ok).toBe(true);
    expect(parseAttemptItemFlag({ flagged: 'yes' }).ok).toBe(false);
  });
  it('parseAttemptArtifact', () => {
    expect(parseAttemptArtifact({ kind: 'file', uri: 's3://x' }).ok).toBe(true);
    expect(parseAttemptArtifact({ kind: 'nope', uri: '' }).ok).toBe(false);
  });
  it('parseAttemptBreak', () => {
    expect(parseAttemptBreak({ reason: 'x' }).ok).toBe(true);
    expect(parseAttemptBreak({}).ok).toBe(false);
  });
  it('parseAttemptIncident', () => {
    expect(parseAttemptIncident({ incidentType: 'focus_loss' }).ok).toBe(true);
    expect(parseAttemptIncident({ incidentType: 'focus_loss', detail: 'd' }).ok).toBe(true);
    expect(parseAttemptIncident({ incidentType: 'bad' }).ok).toBe(false);
  });
  it('parseAttemptPrecheck', () => {
    expect(parseAttemptPrecheck({ checks: { camera: true } }).ok).toBe(true);
    expect(parseAttemptPrecheck({ checks: { camera: 'yes' } }).ok).toBe(false);
    expect(parseAttemptPrecheck({}).ok).toBe(false);
  });
  it('parseAttemptAiMessage', () => {
    expect(parseAttemptAiMessage({ content: 'hi' }).ok).toBe(true);
    expect(parseAttemptAiMessage({ content: '' }).ok).toBe(false);
  });
  it('parseAttemptPluginExecute', () => {
    expect(parseAttemptPluginExecute(undefined).ok).toBe(true);
    expect(parseAttemptPluginExecute({ input: { a: 1 } }).ok).toBe(true);
    expect(parseAttemptPluginExecute({ input: 'x' }).ok).toBe(false);
  });
});

describe('startAttempt', () => {
  it('starts for an admin', async () =>
    expect((await startAttempt(deps(), admin, ID)).ok).toBe(true));
  it('denies a viewer', async () => {
    const r = await startAttempt(deps(), noRole, ID);
    expect(r.ok === false && r.status).toBe(403);
  });
  it('404 when missing', async () => {
    const r = await startAttempt(deps({ startAttempt: () => Promise.resolve(null) }), admin, ID);
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('submitAttempt', () => {
  it('submits', async () => expect((await submitAttempt(deps(), admin, ID)).ok).toBe(true));
  it('404 when missing', async () => {
    const r = await submitAttempt(deps({ submitAttempt: () => Promise.resolve(null) }), admin, ID);
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('saveAttemptResponse', () => {
  it('saves', async () =>
    expect((await saveAttemptResponse(deps(), admin, ID, ITEM, { value: 1 })).ok).toBe(true));
  it('404 when missing', async () => {
    const r = await saveAttemptResponse(
      deps({ saveResponse: () => Promise.resolve(null) }),
      admin,
      ID,
      ITEM,
      {
        value: 1,
      },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('flagAttemptItem', () => {
  it('flags', async () =>
    expect((await flagAttemptItem(deps(), admin, ID, ITEM, { flagged: true })).ok).toBe(true));
});

describe('addAttemptPrecheck', () => {
  it('adds', async () =>
    expect((await addAttemptPrecheck(deps(), admin, ID, { checks: { camera: true } })).ok).toBe(
      true,
    ));
});

describe('startAttemptBreak', () => {
  it('starts a break', async () =>
    expect((await startAttemptBreak(deps(), admin, ID, { reason: 'x' })).ok).toBe(true));
});

describe('recordAttemptIncident', () => {
  it('records', async () =>
    expect(
      (await recordAttemptIncident(deps(), admin, ID, { incidentType: 'focus_loss' })).ok,
    ).toBe(true));
});

describe('addAttemptArtifact', () => {
  it('adds', async () =>
    expect((await addAttemptArtifact(deps(), admin, ID, { kind: 'file', uri: 's3://x' })).ok).toBe(
      true,
    ));
});

describe('deleteAttemptArtifact', () => {
  it('deletes', async () =>
    expect((await deleteAttemptArtifact(deps(), admin, ID, ART)).ok).toBe(true));
  it('404 when not removed', async () => {
    const r = await deleteAttemptArtifact(
      deps({ deleteArtifact: () => Promise.resolve(false) }),
      admin,
      ID,
      ART,
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('postAttemptAiMessage', () => {
  it('posts', async () =>
    expect((await postAttemptAiMessage(deps(), admin, ID, { content: 'hi' })).ok).toBe(true));
});

describe('resetAttemptAi', () => {
  it('resets', async () => expect((await resetAttemptAi(deps(), admin, ID)).ok).toBe(true));
});

describe('executeAttemptPlugin', () => {
  it('executes', async () =>
    expect((await executeAttemptPlugin(deps(), admin, ID, 'com.acme.run', {})).ok).toBe(true));
  it('404 when missing', async () => {
    const r = await executeAttemptPlugin(
      deps({ executePlugin: () => Promise.resolve(null) }),
      admin,
      ID,
      'com.acme.run',
      {},
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});
