/** Types for the onboarding checklist (OpenAPI `get_me_onboarding`/`put_me_onboarding_stepCode`; FR-ACC-15). */
import type { KeysetCursor } from './cursor.js';

/** All lifecycle statuses of an `iam.onboarding_progress` step. */
export const ONBOARDING_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
  'dismissed',
  'expired',
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

/** Subset of statuses a caller may set themselves; `not_started`/`expired` are system-managed. */
export const USER_SETTABLE_ONBOARDING_STATUSES = ['in_progress', 'completed', 'dismissed'] as const;
export type UserSettableOnboardingStatus = (typeof USER_SETTABLE_ONBOARDING_STATUSES)[number];

/** A row of `iam.onboarding_progress` for the caller. */
export interface OnboardingStepRecord {
  readonly id: string;
  readonly roleCode: string;
  readonly stepCode: string;
  readonly materialVersion: string | null;
  readonly status: OnboardingStatus;
  readonly completedAt: string | null;
  readonly updatedAt: string;
}

/** Response projection for an onboarding step (replaces the `GenericRecord` placeholder). */
export interface OnboardingStepDto {
  readonly id: string;
  readonly roleCode: string;
  readonly stepCode: string;
  readonly materialVersion: string | null;
  readonly status: OnboardingStatus;
  readonly completedAt: string | null;
  readonly updatedAt: string;
}

/** `OnboardingPage` response projection (keyset-paginated). */
export interface OnboardingPageDto {
  readonly items: readonly OnboardingStepDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Validated `get_me_onboarding` query. */
export interface OnboardingListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}

/** Validated `put_me_onboarding_stepCode` command; identifies one existing step and its new status. */
export interface OnboardingStepUpdate {
  readonly stepCode: string;
  readonly roleCode: string;
  readonly materialVersion: string | null;
  readonly status: UserSettableOnboardingStatus;
  readonly reason?: string;
}
