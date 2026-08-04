import type { KeysetCursor } from './cursor.js';

export const TRAINING_STATUSES = ['not_started', 'in_progress', 'completed'] as const;
export type TrainingStatus = (typeof TRAINING_STATUSES)[number];

export const CALIBRATION_STATUSES = ['not_calibrated', 'in_progress', 'calibrated'] as const;
export type CalibrationStatus = (typeof CALIBRATION_STATUSES)[number];

export interface ReviewerProfileRecord {
  readonly id: string;
  readonly userId: string;
  readonly expertise: readonly string[];
  readonly trainingStatus: TrainingStatus;
  readonly calibrationStatus: CalibrationStatus;
  readonly conflictDeclarationRequired: boolean;
  readonly maxActiveReviews: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ReviewerProfileDto = ReviewerProfileRecord;

export interface ReviewerProfilePageDto {
  readonly items: readonly ReviewerProfileDto[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export interface ReviewerProfileListQuery {
  readonly limit: number;
  readonly cursor: KeysetCursor | null;
}

export interface ReviewerProfileCreate {
  readonly userId: string;
  readonly expertise?: readonly string[];
  readonly maxActiveReviews?: number;
}
