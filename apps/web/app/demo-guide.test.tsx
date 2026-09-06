import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './page';
import SignInPage from './sign-in/page';
import { SidebarNav } from './components/SidebarNav';
import { AppShell } from './components/AppShell';
import { AsyncBoundary } from './components/AsyncBoundary';
import { apiClient, ApiError } from './lib/api-client';

const navigation = vi.hoisted(() => ({ pathname: '/governance/qms', push: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  navigation.pathname = '/governance/qms';
  navigation.push.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('guided demo entry', () => {
  it.each([401, 403])(
    'offers a safe workspace recovery path for status %s without showing protected content',
    (status) => {
      navigation.pathname = '/employer/applications/example/decision';
      render(
        <AsyncBoundary
          state={{ status: 'error', error: new ApiError(status, 'Access denied.') }}
          onRetry={vi.fn()}
        >
          {() => <p>Protected content</p>}
        </AsyncBoundary>,
      );
      expect(screen.getByRole('link', { name: 'Sign in for Employer' })).toHaveAttribute(
        'href',
        '/sign-in?role=Employer',
      );
      expect(screen.getByRole('link', { name: 'Return to the demo guide' })).toHaveAttribute(
        'href',
        '/',
      );
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    },
  );

  it('preserves retry for service errors and does not guess a workspace for account pages', () => {
    navigation.pathname = '/account/preferences';
    const retry = vi.fn();
    const { rerender } = render(
      <AsyncBoundary
        state={{ status: 'error', error: new ApiError(503, 'Unavailable.') }}
        onRetry={retry}
      >
        {() => null}
      </AsyncBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
    rerender(
      <AsyncBoundary
        state={{ status: 'error', error: new ApiError(401, 'Expired.') }}
        onRetry={retry}
      >
        {() => null}
      </AsyncBoundary>,
    );
    expect(screen.getByRole('link', { name: 'Sign in or switch workspace' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
  });

  it('explains the workflow without presenting it as completed acceptance testing', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { name: 'Start here' })).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('complementary', { name: 'Demo readiness' })).toHaveTextContent(
      'not a release-ready product',
    );
    expect(screen.getByRole('link', { name: 'Start as Employer' })).toHaveAttribute(
      'href',
      '/sign-in?role=Employer',
    );
    expect(screen.getByRole('link', { name: 'Open example decision' })).toHaveAttribute(
      'href',
      '/employer/applications/11111111-0000-4000-8000-000000000217/decision',
    );
  });

  it('highlights a selected role and exposes the previously missing review roles', async () => {
    window.history.replaceState({}, '', '/sign-in?role=Approver');
    render(<SignInPage />);
    expect(await screen.findByRole('status')).toHaveTextContent('choose Approver');
    expect(screen.getByRole('textbox', { name: /Email/ })).toHaveValue(
      'approver@northstar.invalid',
    );
    expect(screen.getByRole('button', { name: /Approver/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Auditor/ })).toBeVisible();
  });

  it('ignores unknown roles rather than treating them as accounts or redirect targets', () => {
    window.history.replaceState({}, '', '/sign-in?role=https://example.invalid');
    render(<SignInPage />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Email/ })).toHaveValue('');
  });

  it.each([
    { mfaRequired: true, passwordResetRequired: false, target: '/mfa' },
    {
      mfaRequired: false,
      passwordResetRequired: true,
      target: '/account/security?passwordResetRequired=true',
    },
    { mfaRequired: false, passwordResetRequired: false, target: '/employer' },
  ])(
    'preserves the authentication redirect to $target',
    async ({ mfaRequired, passwordResetRequired, target }) => {
      const signIn = vi
        .spyOn(apiClient, 'signIn')
        .mockResolvedValue({ mfaRequired, passwordResetRequired, redirectTo: '/employer' });
      render(<SignInPage />);
      fireEvent.click(screen.getByRole('button', { name: /Approver/ }));
      await waitFor(() => expect(navigation.push).toHaveBeenCalledWith(target));
      expect(signIn).toHaveBeenCalledWith(
        'approver@northstar.invalid',
        'CPF-UAT-ChangeMe-2026!',
        '/employer',
      );
    },
  );

  it('marks only the most specific sidebar destination as the current page', () => {
    render(
      <SidebarNav
        label="Governance"
        items={[
          { href: '/governance', label: 'Overview' },
          { href: '/governance/qms', label: 'QMS' },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'QMS' })).toHaveAttribute('aria-current', 'page');
  });

  it('respects exact navigation and path segment boundaries', () => {
    navigation.pathname = '/governance/qms-extra';
    render(
      <SidebarNav
        label="Governance"
        items={[
          { href: '/governance', label: 'Overview', exact: true },
          { href: '/governance/qms', label: 'QMS' },
        ]}
      />,
    );
    for (const link of screen.getAllByRole('link'))
      expect(link).not.toHaveAttribute('aria-current');
  });

  it('provides a route back to the guide without inventing the current tenant or date', () => {
    render(
      <AppShell navLabel="Account" navItems={[]} workspaceLabel="Account">
        <p>Preferences</p>
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: 'Demo guide' })).toHaveAttribute('href', '/');
    fireEvent.click(screen.getByRole('button', { name: 'Open workspace navigation' }));
    expect(screen.getByRole('link', { name: 'My account & organisation' })).toHaveAttribute(
      'href',
      '/account/profile',
    );
    expect(screen.queryByText('Northstar Logistics')).not.toBeInTheDocument();
    expect(screen.queryByText('10 August 2026')).not.toBeInTheDocument();
  });
});
