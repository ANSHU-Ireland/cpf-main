'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Square } from '@phosphor-icons/react';

export interface NavItem {
  readonly href: string;
  readonly label: string;
  /** When true, the item is active only on an exact path match (for section index links). */
  readonly exact?: boolean;
}

export interface SidebarNavProps {
  readonly items: readonly NavItem[];
  readonly label: string;
  readonly onNavigate?: () => void;
}

/** Accessible vertical navigation; marks the active route with aria-current. */
export function SidebarNav({ items, label, onNavigate }: SidebarNavProps): React.JSX.Element {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <p
        style={{
          margin: '14px 8px 16px',
          color: 'var(--color-muted)',
          fontSize: 10,
          fontWeight: 750,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '2px' }}>
        {items.map((item) => {
          const active =
            pathname === item.href || (item.exact !== true && pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                {...(onNavigate ? { onClick: onNavigate } : {})}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minBlockSize: 38,
                  gap: 10,
                  paddingInline: 'calc(var(--space-unit) * 3)',
                  borderRadius: 'var(--radius-control)',
                  textDecoration: 'none',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--color-blue)' : 'var(--color-ink)',
                  background: active ? 'var(--color-paper)' : 'transparent',
                }}
              >
                <Square
                  size={11}
                  weight="fill"
                  color={active ? 'var(--color-blue)' : 'var(--color-line)'}
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
