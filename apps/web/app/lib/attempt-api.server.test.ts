import { describe, expect, it } from 'vitest';
import {
  attemptAiMessages,
  attemptArtifacts,
  attemptControls,
  attemptPluginRuns,
  attemptView,
  type PlatformAttempt,
} from './attempt-api.server.js';

const attempt: PlatformAttempt = {
  id: 'attempt-1',
  status: 'in_progress',
  assessmentTitle: 'Controlled assessment',
  serverNow: '2026-08-16T12:00:00.000Z',
  deadlineAt: '2026-08-16T13:00:00.000Z',
  submittedAt: null,
  receiptRef: null,
  activeItemId: 'item-2',
  sections: [{ id: 'section-1', title: 'Core' }],
  tasks: [
    {
      id: 'item-1',
      sectionId: 'section-1',
      itemType: 'document',
      title: 'Evidence',
      prompt: { brief: 'Explain your evidence.' },
      response: 'Saved response',
      savedAt: '2026-08-16T12:10:00.000Z',
      flagged: true,
      version: 2,
      checksum: 'checksum-1',
    },
    {
      id: 'item-2',
      sectionId: 'section-1',
      itemType: 'coding',
      title: 'Implementation',
      prompt: 'Implement the change.',
      response: null,
      savedAt: null,
      flagged: false,
      version: 0,
      checksum: 'checksum-2',
    },
  ],
  aiMessages: [
    {
      id: 'message-1',
      role: 'assistant',
      content: 'Governed assistance',
      createdAt: '2026-08-16T12:20:00.000Z',
    },
    {
      id: 'message-2',
      role: 'system',
      content: 'Internal instruction',
      createdAt: '2026-08-16T12:21:00.000Z',
    },
  ],
  artifacts: [
    {
      id: 'artifact-1',
      uri: 's3://controlled/evidence.zip',
      scanStatus: 'clean',
      createdAt: '2026-08-16T12:22:00.000Z',
    },
  ],
  pluginExecutions: [
    {
      id: 'plugin-1',
      pluginCode: 'cpf.demo.workspace',
      status: 'requested',
      input: { command: 'test' },
      output: null,
      startedAt: '2026-08-16T12:23:00.000Z',
    },
  ],
  breakActive: true,
};

describe('attempt API projections', () => {
  it('projects tasks without inventing persisted state', () => {
    const result = attemptView(attempt);
    expect(result.status).toBe('in_progress');
    expect(result.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'item-1', status: 'flagged', response: 'Saved response' }),
        expect.objectContaining({ id: 'item-2', status: 'in_progress', kind: 'code' }),
      ]),
    );
  });

  it('conceals internal AI messages and keeps assistant provenance', () => {
    expect(attemptAiMessages(attempt)).toEqual({
      total: 1,
      items: [expect.objectContaining({ id: 'message-1', provenanceRef: 'message-' })],
    });
  });

  it('projects persisted plugin, artifact and break states', () => {
    expect(attemptPluginRuns(attempt).items[0]).toMatchObject({
      status: 'running',
      output: 'Awaiting governed plugin worker.',
    });
    expect(attemptArtifacts(attempt).items[0]).toMatchObject({
      name: 'evidence.zip',
      status: 'clean',
    });
    expect(attemptControls(attempt)).toEqual({
      flaggedTaskIds: ['item-1'],
      breakStatus: 'active',
      breaksRemaining: 1,
    });
  });
});
