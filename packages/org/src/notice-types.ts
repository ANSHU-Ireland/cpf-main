export const NOTICE_TYPES = [
  'privacy',
  'monitoring',
  'ai_use',
  'assessment_rules',
  'accessibility',
] as const;
export type NoticeType = (typeof NOTICE_TYPES)[number];

export interface NoticeRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly noticeType: NoticeType;
  readonly noticeVersion: string;
  readonly acknowledgedAt: string;
  readonly createdAt: string;
}

export type NoticeDto = NoticeRecord;

export interface NoticeCreate {
  readonly noticeType: NoticeType;
  readonly noticeVersion: string;
}

export interface NoticeListResult {
  readonly items: readonly NoticeRecord[];
  readonly total: number;
}
