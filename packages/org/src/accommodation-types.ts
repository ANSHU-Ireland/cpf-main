export const ACCOMMODATION_STATUSES = [
  'requested',
  'under_review',
  'approved',
  'partially_approved',
  'declined',
  'applied',
  'closed',
] as const;
export type AccommodationStatus = (typeof ACCOMMODATION_STATUSES)[number];

export interface AccommodationRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly requestSummary: string;
  readonly operationalAdjustments: Record<string, unknown>;
  readonly status: AccommodationStatus;
  readonly reviewedBy: string | null;
  readonly reviewedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type AccommodationDto = AccommodationRecord;

export interface AccommodationCreate {
  readonly requestSummary: string;
  readonly operationalAdjustments?: Record<string, unknown>;
}

export interface AccommodationStatusUpdate {
  readonly status: AccommodationStatus;
}
