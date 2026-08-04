/** Types for notification preferences (OpenAPI `*_me_notification_preferences`; FR-ACC-14). */
import type { KeysetCursor } from './cursor.js';

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'in_app', 'push'] as const;
export const DIGEST_FREQUENCIES = ['immediate', 'daily', 'weekly', 'never'] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type DigestFrequency = (typeof DIGEST_FREQUENCIES)[number];

/** A row of `iam.notification_preferences` for the caller. */
export interface NotificationPreferenceRecord {
  readonly id: string;
  readonly channel: NotificationChannel;
  readonly category: string;
  readonly enabled: boolean;
  readonly mandatory: boolean;
  readonly digestFrequency: DigestFrequency;
  readonly updatedAt: string;
}

/** Response projection for a notification preference. */
export interface NotificationPreferenceDto {
  readonly id: string;
  readonly channel: NotificationChannel;
  readonly category: string;
  readonly enabled: boolean;
  readonly mandatory: boolean;
  readonly digestFrequency: DigestFrequency;
}

/** `NotificationPreferencePage` response projection (keyset-paginated). */
export interface NotificationPreferencePageDto {
  readonly items: readonly NotificationPreferenceDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** A single validated preference setting from `NotificationPreferenceUpdate`. */
export interface NotificationPreferenceSetting {
  readonly channel: NotificationChannel;
  readonly category: string;
  readonly enabled: boolean;
  readonly digestFrequency?: DigestFrequency;
}

/** Concrete `NotificationPreferenceUpdate` request projection. */
export interface NotificationPreferenceUpdate {
  readonly items: readonly NotificationPreferenceSetting[];
}

/** Validated `get_me_notification_preferences` query. */
export interface NotificationPreferenceListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}
