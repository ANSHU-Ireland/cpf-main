import { describe, it, expect } from 'vitest';
import {
  getDeployerInstruction,
  createGovernanceSubmission,
  approveConformityAssessment,
  updateSeriousIncident,
  decideChangeRequest,
  parseGovernanceSubmissionCreate,
  parseSeriousIncidentUpdate,
  parseChangeRequestDecision,
  parseGovernanceSubmissionId,
  type GovernanceSubmissionRepository,
  type GovernanceSubmissionRecord,
  type DeployerInstructionRecord,
  type GovernanceSubmissionType,
} from './governance-submissions.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const sub: GovernanceSubmissionRecord = {
  id: 's1',
  submissionType: 'ce_marking',
  reference: 'R',
  status: 'draft',
  createdAt: '',
  updatedAt: '',
};
const inst: DeployerInstructionRecord = {
  id: 'i1',
  aiSystemId: T,
  title: 'T',
  content: 'C',
  createdAt: '',
};

function repo(ov: Partial<GovernanceSubmissionRepository> = {}): GovernanceSubmissionRepository {
  return {
    getDeployerInstruction: () => Promise.resolve(inst),
    createSubmission: () => Promise.resolve(sub),
    approveConformityAssessment: () => Promise.resolve(sub),
    updateSeriousIncident: () => Promise.resolve(sub),
    decideChangeRequest: () => Promise.resolve(sub),
    ...ov,
  };
}

const CREATE_TYPES: GovernanceSubmissionType[] = [
  'ce_marking',
  'conformity_assessment',
  'eu_declaration',
  'eu_registration',
  'serious_incident',
  'change_request',
];

describe('parsers', () => {
  it('create valid', () =>
    expect(parseGovernanceSubmissionCreate({ reference: 'r', summary: 's' }).ok).toBe(true));
  it('create invalid', () => expect(parseGovernanceSubmissionCreate({}).ok).toBe(false));
  it('incident valid', () =>
    expect(parseSeriousIncidentUpdate({ status: 'open', notes: 'n' }).ok).toBe(true));
  it('incident invalid', () => expect(parseSeriousIncidentUpdate({}).ok).toBe(false));
  it('decision valid', () =>
    expect(parseChangeRequestDecision({ decision: 'approved', rationale: 'r' }).ok).toBe(true));
  it('decision invalid', () =>
    expect(parseChangeRequestDecision({ decision: 'maybe', rationale: 'r' }).ok).toBe(false));
  it('id valid', () => expect(parseGovernanceSubmissionId(T)).not.toBeNull());
  it('id invalid', () => expect(parseGovernanceSubmissionId('x')).toBeNull());
});

describe('getDeployerInstruction', () => {
  it('ok', async () =>
    expect((await getDeployerInstruction({ repository: repo() }, admin, T)).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await getDeployerInstruction(
          { repository: repo({ getDeployerInstruction: () => Promise.resolve(null) }) },
          admin,
          T,
        )
      ).ok,
    ).toBe(false));
  it('403', async () =>
    expect((await getDeployerInstruction({ repository: repo() }, noRole, T)).ok).toBe(false));
});

describe('createGovernanceSubmission', () => {
  for (const st of CREATE_TYPES) {
    it(`creates ${st}`, async () =>
      expect(
        (
          await createGovernanceSubmission({ repository: repo() }, admin, st, {
            reference: 'r',
            summary: 's',
          })
        ).ok,
      ).toBe(true));
  }
  it('403', async () =>
    expect(
      (
        await createGovernanceSubmission({ repository: repo() }, noRole, 'ce_marking', {
          reference: 'r',
          summary: 's',
        })
      ).ok,
    ).toBe(false));
});

describe('approveConformityAssessment', () => {
  it('ok', async () =>
    expect((await approveConformityAssessment({ repository: repo() }, admin, T)).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await approveConformityAssessment(
          { repository: repo({ approveConformityAssessment: () => Promise.resolve(null) }) },
          admin,
          T,
        )
      ).ok,
    ).toBe(false));
});

describe('updateSeriousIncident', () => {
  it('ok', async () =>
    expect(
      (
        await updateSeriousIncident({ repository: repo() }, admin, T, {
          status: 'open',
          notes: 'n',
        })
      ).ok,
    ).toBe(true));
  it('404', async () =>
    expect(
      (
        await updateSeriousIncident(
          { repository: repo({ updateSeriousIncident: () => Promise.resolve(null) }) },
          admin,
          T,
          { status: 'open', notes: 'n' },
        )
      ).ok,
    ).toBe(false));
});

describe('decideChangeRequest', () => {
  it('ok', async () =>
    expect(
      (
        await decideChangeRequest({ repository: repo() }, admin, T, {
          decision: 'approved',
          rationale: 'r',
        })
      ).ok,
    ).toBe(true));
  it('404', async () =>
    expect(
      (
        await decideChangeRequest(
          { repository: repo({ decideChangeRequest: () => Promise.resolve(null) }) },
          admin,
          T,
          { decision: 'approved', rationale: 'r' },
        )
      ).ok,
    ).toBe(false));
});
