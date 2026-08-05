import { describe, it, expect } from 'vitest';
import {
  createMemberInvitation,
  resendMemberInvitation,
  revokeMemberInvitation,
  parseMemberInvitationCreate,
  parseMemberInvitationId,
  type MemberInvitationRepository,
  type MemberInvitationRecord,
} from './member-invitations.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const inv: MemberInvitationRecord = {
  id: 'i1',
  email: 'a@b.com',
  roles: ['reviewer'],
  status: 'pending',
  createdAt: '',
};

function repo(ov: Partial<MemberInvitationRepository> = {}): MemberInvitationRepository {
  return {
    createInvitation: () => Promise.resolve(inv),
    resendInvitation: () => Promise.resolve(inv),
    revokeInvitation: () => Promise.resolve(true),
    ...ov,
  };
}

describe('parseMemberInvitationCreate', () => {
  it('valid', () =>
    expect(parseMemberInvitationCreate({ email: 'a@b.com', roles: ['reviewer'] }).ok).toBe(true));
  it('bad email', () =>
    expect(parseMemberInvitationCreate({ email: 'x', roles: ['r'] }).ok).toBe(false));
  it('empty roles', () =>
    expect(parseMemberInvitationCreate({ email: 'a@b.com', roles: [] }).ok).toBe(false));
});
describe('parseMemberInvitationId', () => {
  it('uuid', () => expect(parseMemberInvitationId(T)).not.toBeNull());
  it('bad', () => expect(parseMemberInvitationId('x')).toBeNull());
});
describe('createMemberInvitation', () => {
  it('ok', async () =>
    expect(
      (
        await createMemberInvitation({ repository: repo() }, admin, {
          email: 'a@b.com',
          roles: ['reviewer'],
        })
      ).ok,
    ).toBe(true));
  it('403', async () =>
    expect(
      (
        await createMemberInvitation({ repository: repo() }, noRole, {
          email: 'a@b.com',
          roles: ['reviewer'],
        })
      ).ok,
    ).toBe(false));
});
describe('resendMemberInvitation', () => {
  it('ok', async () =>
    expect((await resendMemberInvitation({ repository: repo() }, admin, 'i1')).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await resendMemberInvitation(
          { repository: repo({ resendInvitation: () => Promise.resolve(null) }) },
          admin,
          'i1',
        )
      ).ok,
    ).toBe(false));
});
describe('revokeMemberInvitation', () => {
  it('ok', async () =>
    expect((await revokeMemberInvitation({ repository: repo() }, admin, 'i1')).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await revokeMemberInvitation(
          { repository: repo({ revokeInvitation: () => Promise.resolve(false) }) },
          admin,
          'i1',
        )
      ).ok,
    ).toBe(false));
});
