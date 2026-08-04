// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import type { UserProfileDto } from '@cpf/account';
import { AccountProfileView } from './AccountProfileView.js';

afterEach(cleanup);

const base: UserProfileDto = {
  userId: 'user-1',
  email: 'ada@example.com',
  displayName: 'Ada Lovelace',
  userType: 'employer_user',
  status: 'active',
  tenant: { tenantId: 'tenant-1', membershipStatus: 'active', roles: ['employer_admin', 'viewer'] },
};

describe('AccountProfileView', () => {
  it('exposes a region labelled by the user name', () => {
    render(<AccountProfileView profile={base} />);
    expect(screen.getByRole('region', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
  });

  it('lists the tenant roles', () => {
    render(<AccountProfileView profile={base} />);
    const list = screen.getByRole('list');
    const items = within(list)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(items).toEqual(['employer_admin', 'viewer']);
  });

  it('falls back to the email as the accessible name when no display name', () => {
    render(<AccountProfileView profile={{ ...base, displayName: null }} />);
    expect(screen.getByRole('heading', { name: 'ada@example.com' })).toBeInTheDocument();
  });

  it('shows a no-membership message when there is no tenant context', () => {
    render(<AccountProfileView profile={{ ...base, tenant: null }} />);
    expect(screen.getByText(/no organisation membership/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
