'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  readonly href: string;
  readonly label: string;
  /** When true, the item is active only on an exact path match (for section index links). */
  readonly exact?: boolean;
}

export interface SidebarNavProps {
  readonly items: readonly NavItem[];
  readonly label: string;
}

/** Accessible vertical navigation; marks the active route with aria-current. */
export function SidebarNav({ items, label }: SidebarNavProps): React.JSX.Element {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '2px' }}>
        {items.map((item) => {
          const active =
            pathname === item.href || (item.exact !== true && pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minBlockSize: 'var(--target-min)',
                  paddingInline: 'calc(var(--space-unit) * 3)',
                  borderRadius: 'var(--radius-control)',
                  textDecoration: 'none',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--color-blue)' : 'var(--color-ink)',
                  background: active ? 'var(--color-blue-soft)' : 'transparent',
                }}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
