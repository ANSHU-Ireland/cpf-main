import type { ReactNode } from 'react';
import './globals.css';
import { buildThemeCss } from './theme';
import { SyntheticBanner } from './components/SyntheticBanner';

export const metadata = {
  title: 'CPF — Compliance Prompt Factory',
  description: 'Role-aware assessment, review and governance workspace (synthetic demo).',
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <head>
        {/* Token-derived CSS custom properties; single source of truth is @cpf/tokens. */}
        <style dangerouslySetInnerHTML={{ __html: buildThemeCss() }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <SyntheticBanner />
        {children}
      </body>
    </html>
  );
}
