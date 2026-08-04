/** Actor identity as resolved by the (future) auth layer; mirrors the account surface's shape. */
export interface Actor {
  readonly userId: string;
  readonly tenantId: string;
  readonly roles: readonly string[];
}

/** Lifecycle statuses of a `tenant.organizations` row. */
export const ORGANIZATION_STATUSES = [
  'draft',
  'pending_approval',
  'active',
  'suspended',
  'terminated',
] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

/** A caller-facing projection of the caller's own `tenant.organizations` row. */
export interface OrganizationRecord {
  readonly id: string;
  readonly slug: string;
  readonly legalName: string;
  readonly displayName: string;
  readonly status: OrganizationStatus;
  readonly dataRegion: string;
  readonly defaultTimezone: string;
  readonly branding: Readonly<Record<string, unknown>>;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly suspendedAt: string | null;
  readonly terminatedAt: string | null;
}

/** Response projection for `get_organization` (replaces the `GenericRecord` placeholder). */
export type OrganizationDto = OrganizationRecord;
