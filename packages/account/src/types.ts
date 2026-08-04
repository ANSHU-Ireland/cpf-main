/** Types for the account/identity vertical (OpenAPI `get_me`; FR-ACC-04, FR-ACC-12). */

/** Authenticated caller, derived from verified server context — never from a request body. */
export interface Actor {
  readonly userId: string;
  readonly tenantId: string;
  readonly roles: readonly string[];
}

export interface UserRecord {
  readonly id: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly userType: string;
  readonly status: string;
}

export interface MembershipRecord {
  readonly tenantId: string;
  readonly status: string;
  readonly roles: readonly string[];
}

export interface ProfileData {
  readonly user: UserRecord | null;
  readonly membership: MembershipRecord | null;
}

export interface TenantContextDto {
  readonly tenantId: string;
  readonly membershipStatus: string;
  readonly roles: readonly string[];
}

/** Response projection for `get_me` (UserProfile); role- and tenant-scoped. */
export interface UserProfileDto {
  readonly userId: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly userType: string;
  readonly status: string;
  readonly tenant: TenantContextDto | null;
}
