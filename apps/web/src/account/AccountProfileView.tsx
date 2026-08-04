import { useId } from 'react';
import { color, space } from '@cpf/tokens';
import type { UserProfileDto } from '@cpf/account';

export interface AccountProfileViewProps {
  readonly profile: UserProfileDto;
}

/** Read-only presentation of the `get_me` profile, composed from design tokens. */
export function AccountProfileView({ profile }: AccountProfileViewProps): React.JSX.Element {
  const headingId = useId();
  const name = profile.displayName ?? profile.email ?? 'Unnamed user';
  const roles = profile.tenant?.roles ?? [];

  return (
    <section
      aria-labelledby={headingId}
      style={{ color: color.ink, display: 'flex', flexDirection: 'column', gap: space.unitPx * 2 }}
    >
      <h2 id={headingId} style={{ margin: 0 }}>
        {name}
      </h2>
      <dl
        style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: space.unitPx, margin: 0 }}
      >
        <dt style={{ color: color.muted }}>Email</dt>
        <dd style={{ margin: 0 }}>{profile.email ?? '—'}</dd>
        <dt style={{ color: color.muted }}>Account type</dt>
        <dd style={{ margin: 0 }}>{profile.userType}</dd>
        <dt style={{ color: color.muted }}>Status</dt>
        <dd style={{ margin: 0 }}>{profile.status}</dd>
      </dl>
      {profile.tenant === null ? (
        <p style={{ color: color.muted, margin: 0 }}>No organisation membership in this context.</p>
      ) : (
        <div>
          <h3 style={{ margin: `0 0 ${space.unitPx}px` }}>Roles</h3>
          {roles.length === 0 ? (
            <p style={{ color: color.muted, margin: 0 }}>No roles assigned.</p>
          ) : (
            <ul style={{ margin: 0, paddingInlineStart: space.unitPx * 5 }}>
              {roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
