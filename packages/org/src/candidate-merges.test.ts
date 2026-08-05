import { describe, it, expect } from 'vitest';
import {
  previewCandidateMerge,
  mergeCandidates,
  reverseCandidateMerge,
  parseCandidateMergeInput,
  parseMergeId,
} from './candidate-merges.js';
import type { CandidateMergeRepository, MergeRecord, MergePreview } from './candidate-merges.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const A = '33333333-3333-3333-3333-333333333333';
const B = '44444444-4444-4444-4444-444444444444';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const merge: MergeRecord = {
  id: 'm1',
  primaryCandidateId: A,
  duplicateCandidateId: B,
  status: 'merged',
  mergedAt: '',
};
const preview: MergePreview = {
  primaryCandidateId: A,
  duplicateCandidateId: B,
  conflicts: [],
  fieldsMerged: 3,
};
const input = { primaryCandidateId: A, duplicateCandidateId: B };

function repo(ov: Partial<CandidateMergeRepository> = {}): CandidateMergeRepository {
  return {
    previewMerge: () => Promise.resolve(preview),
    mergeCandidates: () => Promise.resolve(merge),
    reverseMerge: () => Promise.resolve(merge),
    ...ov,
  };
}

describe('parseCandidateMergeInput', () => {
  it('valid', () => expect(parseCandidateMergeInput(input).ok).toBe(true));
  it('non-uuid', () =>
    expect(
      parseCandidateMergeInput({ primaryCandidateId: 'a', duplicateCandidateId: 'b' }).ok,
    ).toBe(false));
  it('same id', () =>
    expect(parseCandidateMergeInput({ primaryCandidateId: A, duplicateCandidateId: A }).ok).toBe(
      false,
    ));
});
describe('parseMergeId', () => {
  it('uuid', () => expect(parseMergeId(T)).not.toBeNull());
  it('bad', () => expect(parseMergeId('x')).toBeNull());
});
describe('previewCandidateMerge', () => {
  it('ok', async () =>
    expect((await previewCandidateMerge({ repository: repo() }, admin, input)).ok).toBe(true));
  it('403', async () =>
    expect((await previewCandidateMerge({ repository: repo() }, noRole, input)).ok).toBe(false));
});
describe('mergeCandidates', () => {
  it('ok', async () =>
    expect((await mergeCandidates({ repository: repo() }, admin, input)).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await mergeCandidates(
          { repository: repo({ mergeCandidates: () => Promise.resolve(null) }) },
          admin,
          input,
        )
      ).ok,
    ).toBe(false));
});
describe('reverseCandidateMerge', () => {
  it('ok', async () =>
    expect((await reverseCandidateMerge({ repository: repo() }, admin, 'm1')).ok).toBe(true));
  it('403', async () =>
    expect((await reverseCandidateMerge({ repository: repo() }, noRole, 'm1')).ok).toBe(false));
});
