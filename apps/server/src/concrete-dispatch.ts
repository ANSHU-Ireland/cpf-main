import type { Pool } from 'pg';
import {
  createCampaignLifecycleService,
  createCampaignService,
  createAttemptService,
  createScorecardService,
  handleAddAttemptArtifact,
  handleAttemptAiMessage,
  handleAttemptAiReset,
  handleAttemptBreak,
  handleAttemptIncident,
  handleAttemptPrecheck,
  handleDeleteAttemptArtifact,
  handleExecuteAttemptPlugin,
  handleFlagAttemptItem,
  handleActivateCampaign,
  handleArchiveCampaign,
  handleCloseCampaign,
  handleDuplicateCampaign,
  handleGetCampaign,
  handleGetCampaigns,
  handleGetAttempt,
  handleGetScorecard,
  handlePatchCampaign,
  handlePauseCampaign,
  handlePostCampaign,
  handlePutScorecard,
  handleSaveAttemptResponse,
  handleStartAttempt,
  handleSubmitAttempt,
} from '@cpf/api';
import {
  PgAttemptRepository,
  PgCampaignRepository,
  PgScorecardRepository,
  type Actor,
  type RawCampaignListQuery,
} from '@cpf/org';
import type { HttpResponse } from '@cpf/http';

const CONCRETE_OPERATIONS = new Set([
  'delete_attempts_attemptId_artifacts_artifactId',
  'get_attempts_attemptId',
  'get_campaigns',
  'get_campaigns_campaignId',
  'get_review_assignments_assignmentId_scorecard',
  'post_attempts_attemptId_ai_messages',
  'post_attempts_attemptId_ai_reset',
  'post_attempts_attemptId_artifacts',
  'post_attempts_attemptId_breaks',
  'post_attempts_attemptId_incidents',
  'post_attempts_attemptId_plugins_pluginCode_execute',
  'post_attempts_attemptId_prechecks',
  'post_attempts_attemptId_start',
  'post_attempts_attemptId_submit',
  'post_campaigns',
  'post_campaigns_campaignId_activate',
  'post_campaigns_campaignId_archive',
  'post_campaigns_campaignId_close',
  'post_campaigns_campaignId_duplicate',
  'post_campaigns_campaignId_pause',
  'patch_campaigns_campaignId',
  'put_attempts_attemptId_item_flags_itemId',
  'put_attempts_attemptId_responses_itemId',
  'put_review_assignments_assignmentId_scorecard',
]);

export function isConcreteOperation(operationId: string): boolean {
  return CONCRETE_OPERATIONS.has(operationId);
}

export class ConcreteDispatcher {
  readonly #attempts;
  readonly #campaigns;
  readonly #campaignLifecycle;
  readonly #scorecards;

  constructor(pool: Pool, options: { role?: string } = {}) {
    this.#attempts = createAttemptService({ repository: new PgAttemptRepository(pool, options) });
    const campaignRepository = new PgCampaignRepository(pool, options);
    this.#campaigns = createCampaignService({ repository: campaignRepository });
    this.#campaignLifecycle = createCampaignLifecycleService({ repository: campaignRepository });
    this.#scorecards = createScorecardService({
      repository: new PgScorecardRepository(pool, options),
    });
  }

  async dispatch(
    operationId: string,
    actor: Actor,
    params: Readonly<Record<string, string>>,
    body: unknown,
    query: RawCampaignListQuery = {},
  ): Promise<HttpResponse | null> {
    const attemptId = params['attemptId'] ?? '';
    const itemId = params['itemId'] ?? '';
    const assignmentId = params['assignmentId'] ?? '';
    const campaignId = params['campaignId'] ?? '';

    switch (operationId) {
      case 'get_attempts_attemptId':
        return handleGetAttempt(this.#attempts, { actor, attemptId });
      case 'get_campaigns':
        return handleGetCampaigns(this.#campaigns, { actor, query });
      case 'post_campaigns':
        return handlePostCampaign(this.#campaigns, { actor, body });
      case 'get_campaigns_campaignId':
        return handleGetCampaign(this.#campaigns, { actor, campaignId });
      case 'patch_campaigns_campaignId':
        return handlePatchCampaign(this.#campaigns, { actor, campaignId, body });
      case 'post_campaigns_campaignId_activate':
        return handleActivateCampaign(this.#campaignLifecycle, { actor, campaignId });
      case 'post_campaigns_campaignId_pause':
        return handlePauseCampaign(this.#campaignLifecycle, { actor, campaignId });
      case 'post_campaigns_campaignId_close':
        return handleCloseCampaign(this.#campaignLifecycle, { actor, campaignId });
      case 'post_campaigns_campaignId_archive':
        return handleArchiveCampaign(this.#campaignLifecycle, { actor, campaignId });
      case 'post_campaigns_campaignId_duplicate':
        return handleDuplicateCampaign(this.#campaignLifecycle, { actor, campaignId, body });
      case 'post_attempts_attemptId_start':
        return handleStartAttempt(this.#attempts, { actor, attemptId });
      case 'post_attempts_attemptId_submit':
        return handleSubmitAttempt(this.#attempts, { actor, attemptId });
      case 'put_attempts_attemptId_responses_itemId':
        return handleSaveAttemptResponse(this.#attempts, { actor, attemptId, itemId, body });
      case 'put_attempts_attemptId_item_flags_itemId':
        return handleFlagAttemptItem(this.#attempts, { actor, attemptId, itemId, body });
      case 'post_attempts_attemptId_prechecks':
        return handleAttemptPrecheck(this.#attempts, { actor, attemptId, body });
      case 'post_attempts_attemptId_breaks':
        return handleAttemptBreak(this.#attempts, { actor, attemptId, body });
      case 'post_attempts_attemptId_incidents':
        return handleAttemptIncident(this.#attempts, { actor, attemptId, body });
      case 'post_attempts_attemptId_artifacts':
        return handleAddAttemptArtifact(this.#attempts, { actor, attemptId, body });
      case 'delete_attempts_attemptId_artifacts_artifactId':
        return handleDeleteAttemptArtifact(this.#attempts, {
          actor,
          attemptId,
          artifactId: params['artifactId'] ?? '',
        });
      case 'post_attempts_attemptId_ai_messages':
        return handleAttemptAiMessage(this.#attempts, { actor, attemptId, body });
      case 'post_attempts_attemptId_ai_reset':
        return handleAttemptAiReset(this.#attempts, { actor, attemptId });
      case 'post_attempts_attemptId_plugins_pluginCode_execute':
        return handleExecuteAttemptPlugin(this.#attempts, {
          actor,
          attemptId,
          pluginCode: params['pluginCode'] ?? '',
          body,
        });
      case 'get_review_assignments_assignmentId_scorecard':
        return handleGetScorecard(this.#scorecards, { actor, assignmentId });
      case 'put_review_assignments_assignmentId_scorecard':
        return handlePutScorecard(this.#scorecards, { actor, assignmentId, body });
      default:
        return null;
    }
  }
}
