import type { ReactNode } from 'react';
import { AdminShell } from './AdminShell';

export default function AdminLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <AdminShell>{children}</AdminShell>;
}
