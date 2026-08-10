import Link from 'next/link';
import { WarningCircle } from '@phosphor-icons/react/dist/ssr';
import { Button, Field, Input } from '@cpf/ui';
import { AppShell } from '../components/AppShell';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';

const NAV_ITEMS = [
  { href: '/design-system', label: 'Overview', exact: true },
  { href: '/design-system#work', label: 'Work' },
  { href: '/design-system#evidence', label: 'Evidence' },
  { href: '/design-system#settings', label: 'Settings' },
] as const;

const actionLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'var(--target-min)',
  paddingInline: 20,
  borderRadius: 'var(--radius-control)',
  background: 'var(--color-blue)',
  color: 'var(--color-paper)',
  textDecoration: 'none',
  fontWeight: 600,
};

export default function DesignSystemPage(): React.JSX.Element {
  const headingId = 'design-system-heading';
  return (
    <AppShell
      navLabel="Design system"
      navItems={NAV_ITEMS}
      homeHref="/design-system"
      workspaceLabel="Design system"
    >
      <section aria-labelledby={headingId}>
        <PageHeader
          headingId={headingId}
          title="Design system, states and accessibility"
          description="Cross-cutting interaction, visual, responsive and accessibility contract for every role journey."
          actions={
            <Link href="#components" style={actionLinkStyle}>
              Open component spec
            </Link>
          }
        />

        <Card
          aria-label="Current state"
          style={{
            marginBottom: 20,
            minHeight: 640,
            textAlign: 'center',
            paddingBlock: 56,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WarningCircle
            aria-hidden="true"
            size={80}
            weight="duotone"
            color="var(--color-amber)"
            style={{ marginBottom: 20 }}
          />
          <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem' }}>
            Design system, states and accessibility
          </h2>
          <p style={{ margin: '0 auto 24px', maxWidth: '50ch', color: 'var(--color-muted)' }}>
            The shared contract covers loading, ready, empty, filtered-empty, draft, validation
            error, denied, conflict, expired and offline states.
          </p>
          <div
            style={{
              width: 'min(100%, 520px)',
              marginTop: 52,
              padding: 20,
              border: '1px solid var(--color-line)',
              borderRadius: 'var(--radius-control)',
              background: 'var(--color-soft)',
              textAlign: 'left',
            }}
          >
            <p style={{ margin: '0 0 8px', color: 'var(--color-muted)', fontWeight: 600 }}>
              Current state
            </p>
            <p style={{ margin: 0 }}>
              loading · ready · empty · filtered-empty · draft · validation error · denied ·
              conflict · expired · offline · queued · partial · failed · cancelled · complete
            </p>
          </div>
          <Link href="#components" style={{ ...actionLinkStyle, marginTop: 52 }}>
            Open component spec
          </Link>
        </Card>

        <div
          id="components"
          className="design-system-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
          }}
        >
          <Card
            as="article"
            aria-label="Actions"
            style={{ display: 'grid', alignContent: 'start', gap: 16 }}
          >
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Actions</h2>
            <Button>Primary action</Button>
            <Button variant="secondary">Secondary action</Button>
            <Button variant="danger">Destructive action</Button>
            <Button disabled>Disabled action</Button>
          </Card>

          <Card
            as="article"
            aria-label="Form controls"
            style={{ display: 'grid', alignContent: 'start', gap: 16 }}
          >
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Form controls</h2>
            <Field label="Display name" hint="Use a clear, human-readable value.">
              {({ id, invalid, describedBy }) => (
                <Input
                  id={id}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  defaultValue="Alex Morgan"
                />
              )}
            </Field>
            <Field label="Reference" error="Reference is required.">
              {({ id, invalid, describedBy }) => (
                <Input id={id} invalid={invalid} aria-describedby={describedBy} />
              )}
            </Field>
          </Card>

          <Card
            as="article"
            aria-label="Status language"
            style={{ display: 'grid', alignContent: 'start', gap: 16 }}
          >
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Status language</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <StatusBadge tone="info">In review</StatusBadge>
              <StatusBadge tone="success">Complete</StatusBadge>
              <StatusBadge tone="warning">Needs attention</StatusBadge>
              <StatusBadge tone="danger">Blocked</StatusBadge>
            </div>
            <p style={{ margin: 0, color: 'var(--color-muted)' }}>
              Status is always communicated with text as well as colour.
            </p>
          </Card>

          <Card
            as="article"
            aria-label="Accessibility contract"
            style={{ display: 'grid', alignContent: 'start', gap: 12 }}
          >
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Accessibility contract</h2>
            <ul style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 8 }}>
              <li>WCAG 2.2 AA colour contrast</li>
              <li>44 px minimum interaction targets</li>
              <li>Visible keyboard focus</li>
              <li>Programmatic labels and descriptions</li>
              <li>Reduced-motion preferences honoured</li>
            </ul>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
