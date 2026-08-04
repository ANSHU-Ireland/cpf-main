import type { KeysetCursor } from './cursor.js';

export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'closed', 'archived'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export interface CampaignRecord {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly roleName: string;
  readonly seniority: string;
  readonly status: CampaignStatus;
  readonly departmentId: string | null;
  readonly teamId: string | null;
  readonly ownerUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CampaignDto = CampaignRecord;

export interface CampaignPageDto {
  readonly items: readonly CampaignDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface CampaignListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}

export interface CampaignCreate {
  readonly code: string;
  readonly title: string;
  readonly roleName: string;
  readonly seniority: string;
  readonly departmentId?: string;
  readonly teamId?: string;
}

export interface CampaignUpdate {
  readonly title?: string;
  readonly roleName?: string;
  readonly seniority?: string;
  readonly departmentId?: string | null;
  readonly teamId?: string | null;
}
