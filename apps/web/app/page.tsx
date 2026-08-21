import Link from 'next/link';
import { Card } from './components/Card';

export default function LandingPage(): React.JSX.Element {
  return (
    <main
      id="main"
      style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'calc(var(--space-unit) * 8) calc(var(--space-unit) * 4)',
      }}
    >
      <Card style={{ maxWidth: '560px', textAlign: 'center' }}>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
        >
          <h1 style={{ margin: 0 }}>Compliance Prompt Factory</h1>
          <p style={{ margin: 0, color: 'var(--color-muted)' }}>
            Role-aware assessment, human review and governance. This is a synthetic demo of the web
            workspace.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 'calc(var(--space-unit) * 3)',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/sign-in"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minBlockSize: 'var(--target-min)',
                paddingInline: 'calc(var(--space-unit) * 5)',
                borderRadius: 'var(--radius-control)',
                background: 'var(--color-blue)',
                color: 'var(--color-paper)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Sign in
            </Link>
            <Link
              href="/sign-in"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minBlockSize: 'var(--target-min)',
                paddingInline: 'calc(var(--space-unit) * 5)',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-line)',
                color: 'var(--color-ink)',
                textDecoration: 'none',
              }}
            >
              Choose a demo workspace
            </Link>
          </div>
        </div>
      </Card>
    </main>
  );
}
