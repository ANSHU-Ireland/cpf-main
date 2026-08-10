import { describe, it, expect } from 'vitest';
import type {
  Actor,
  AttemptRepository,
  AttemptRecord,
  AttemptSessionRecord,
  AttemptResponseRecord,
  AttemptItemFlagRecord,
  AttemptArtifactRecord,
  AttemptBreakRecord,
  AttemptIncidentRecord,
  AttemptPrecheckRecord,
  AttemptAiMessageRecord,
  AttemptPluginExecutionRecord,
} from '@cpf/org';
import {
  createAttemptService,
  handleGetAttempt,
  handleStartAttempt,
  handleSubmitAttempt,
  handleSaveAttemptResponse,
  handleFlagAttemptItem,
  handleAttemptPrecheck,
  handleAttemptBreak,
  handleAttemptIncident,
  handleAddAttemptArtifact,
  handleDeleteAttemptArtifact,
  handleAttemptAiMessage,
  handleAttemptAiReset,
  handleExecuteAttemptPlugin,
} from './attempts.handler.js';

const actor: Actor = { userId: 'u1', tenantId: 't1', roles: ['employer_admin'] };
const ID = '11111111-1111-1111-1111-111111111111';
const ITEM = '22222222-2222-2222-2222-222222222222';
const ART = '33333333-3333-3333-3333-333333333333';

const attempt: AttemptRecord = {
  id: ID,
  applicationId: ID,
  assessmentVersionId: ID,
  status: 'in_progress',
  startedAt: '',
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
const response: AttemptResponseRecord = { attemptId: ID, itemId: ITEM, value: 1, savedAt: '' };
const flag: AttemptItemFlagRecord = { attemptId: ID, itemId: ITEM, flagged: true };
const artifact: AttemptArtifactRecord = {
  id: ART,
  attemptId: ID,
  kind: 'file',
  uri: 's3://x',
  createdAt: '',
};
const brk: AttemptBreakRecord = { id: 'b1', attemptId: ID, reason: 'x', startedAt: '' };
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
    submitAttempt: () => Promise.resolve(attempt),
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

function svc(overrides: Partial<AttemptRepository> = {}) {
  return createAttemptService({ repository: repo(overrides) });
}

describe('handleGetAttempt', () => {
  it('200', async () =>
    expect((await handleGetAttempt(svc(), { actor, attemptId: ID })).status).toBe(200));
  it('422 for a bad id', async () =>
    expect((await handleGetAttempt(svc(), { actor, attemptId: 'bad' })).status).toBe(422));
  it('404 when missing', async () =>
    expect(
      (
        await handleGetAttempt(svc({ getAttempt: () => Promise.resolve(null) }), {
          actor,
          attemptId: ID,
        })
      ).status,
    ).toBe(404));
});

describe('handleStartAttempt', () => {
  it('200', async () =>
    expect((await handleStartAttempt(svc(), { actor, attemptId: ID })).status).toBe(200));
  it('422 for a bad id', async () =>
    expect((await handleStartAttempt(svc(), { actor, attemptId: 'bad' })).status).toBe(422));
  it('404 when missing', async () =>
    expect(
      (
        await handleStartAttempt(svc({ startAttempt: () => Promise.resolve(null) }), {
          actor,
          attemptId: ID,
        })
      ).status,
    ).toBe(404));
});

describe('handleSubmitAttempt', () => {
  it('200', async () =>
    expect((await handleSubmitAttempt(svc(), { actor, attemptId: ID })).status).toBe(200));
});

describe('handleSaveAttemptResponse', () => {
  it('200', async () =>
    expect(
      (
        await handleSaveAttemptResponse(svc(), {
          actor,
          attemptId: ID,
          itemId: ITEM,
          body: { value: 1 },
        })
      ).status,
    ).toBe(200));
  it('422 for a bad item id', async () =>
    expect(
      (
        await handleSaveAttemptResponse(svc(), {
          actor,
          attemptId: ID,
          itemId: 'bad',
          body: { value: 1 },
        })
      ).status,
    ).toBe(422));
  it('422 for an invalid body', async () =>
    expect(
      (await handleSaveAttemptResponse(svc(), { actor, attemptId: ID, itemId: ITEM, body: {} }))
        .status,
    ).toBe(422));
});

describe('handleFlagAttemptItem', () => {
  it('200', async () =>
    expect(
      (
        await handleFlagAttemptItem(svc(), {
          actor,
          attemptId: ID,
          itemId: ITEM,
          body: { flagged: true },
        })
      ).status,
    ).toBe(200));
});

describe('handleAttemptPrecheck', () => {
  it('201', async () =>
    expect(
      (
        await handleAttemptPrecheck(svc(), {
          actor,
          attemptId: ID,
          body: { checks: { camera: true } },
        })
      ).status,
    ).toBe(201));
});

describe('handleAttemptBreak', () => {
  it('201', async () =>
    expect(
      (await handleAttemptBreak(svc(), { actor, attemptId: ID, body: { reason: 'x' } })).status,
    ).toBe(201));
});

describe('handleAttemptIncident', () => {
  it('201', async () =>
    expect(
      (
        await handleAttemptIncident(svc(), {
          actor,
          attemptId: ID,
          body: { incidentType: 'focus_loss' },
        })
      ).status,
    ).toBe(201));
});

describe('handleAddAttemptArtifact', () => {
  it('201', async () =>
    expect(
      (
        await handleAddAttemptArtifact(svc(), {
          actor,
          attemptId: ID,
          body: { kind: 'file', uri: 's3://x' },
        })
      ).status,
    ).toBe(201));
});

describe('handleDeleteAttemptArtifact', () => {
  it('204', async () =>
    expect(
      (await handleDeleteAttemptArtifact(svc(), { actor, attemptId: ID, artifactId: ART })).status,
    ).toBe(204));
  it('404 when not removed', async () =>
    expect(
      (
        await handleDeleteAttemptArtifact(svc({ deleteArtifact: () => Promise.resolve(false) }), {
          actor,
          attemptId: ID,
          artifactId: ART,
        })
      ).status,
    ).toBe(404));
});

describe('handleAttemptAiMessage', () => {
  it('201', async () =>
    expect(
      (await handleAttemptAiMessage(svc(), { actor, attemptId: ID, body: { content: 'hi' } }))
        .status,
    ).toBe(201));
});

describe('handleAttemptAiReset', () => {
  it('200', async () =>
    expect((await handleAttemptAiReset(svc(), { actor, attemptId: ID })).status).toBe(200));
});

describe('handleExecuteAttemptPlugin', () => {
  it('200', async () =>
    expect(
      (
        await handleExecuteAttemptPlugin(svc(), {
          actor,
          attemptId: ID,
          pluginCode: 'com.acme.run',
          body: {},
        })
      ).status,
    ).toBe(200));
  it('422 for a bad plugin code', async () =>
    expect(
      (
        await handleExecuteAttemptPlugin(svc(), {
          actor,
          attemptId: ID,
          pluginCode: 'BAD CODE',
          body: {},
        })
      ).status,
    ).toBe(422));
});
