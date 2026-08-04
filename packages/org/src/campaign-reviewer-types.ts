import type { KeysetCursor } from './cursor.js';

export const CAMPAIGN_REVIEWER_ROLES = ['primary', 'secondary', 'adjudicator', 'qa'] as const;
export type CampaignReviewerRole = (typeof CAMPAIGN_REVIEWER_ROLES)[number];

export const CONFLICT_STATUSES = ['pending', 'clear', 'declared', 'waived'] as const;
export type ConflictStatus = (typeof CONFLICT_STATUSES)[number];

export interface CampaignReviewerRecord {
  readonly id: string;
  readonly campaignId: string;
  readonly reviewerProfileId: string;
  readonly role: CampaignReviewerRole;
  readonly conflictStatus: ConflictStatus;
  readonly active: boolean;
  readonly createdAt: string;
}

export type CampaignReviewerDto = CampaignReviewerRecord;

export interface CampaignReviewerPageDto {
  readonly items: readonly CampaignReviewerDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface CampaignReviewerListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}

export interface CampaignReviewerCreate {
  readonly reviewerProfileId: string;
  readonly role: CampaignReviewerRole;
}

export interface CampaignReviewerUpdate {
  readonly role?: CampaignReviewerRole;
  readonly conflictStatus?: ConflictStatus;
}
