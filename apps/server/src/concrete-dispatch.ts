import type { Pool } from 'pg';
import {
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
  handleGetScorecard,
  handlePutScorecard,
  handleSaveAttemptResponse,
  handleStartAttempt,
  handleSubmitAttempt,
} from '@cpf/api';
import { PgAttemptRepository, PgScorecardRepository, type Actor } from '@cpf/org';
import type { HttpResponse } from '@cpf/http';

const CONCRETE_OPERATIONS = new Set([
  'delete_attempts_attemptId_artifacts_artifactId',
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
  'put_attempts_attemptId_item_flags_itemId',
  'put_attempts_attemptId_responses_itemId',
  'put_review_assignments_assignmentId_scorecard',
]);

export function isConcreteOperation(operationId: string): boolean {
  return CONCRETE_OPERATIONS.has(operationId);
}

export class ConcreteDispatcher {
  readonly #attempts;
  readonly #scorecards;

  constructor(pool: Pool, options: { role?: string } = {}) {
    this.#attempts = createAttemptService({ repository: new PgAttemptRepository(pool, options) });
    this.#scorecards = createScorecardService({
      repository: new PgScorecardRepository(pool, options),
    });
  }

  async dispatch(
    operationId: string,
    actor: Actor,
    params: Readonly<Record<string, string>>,
    body: unknown,
  ): Promise<HttpResponse | null> {
    const attemptId = params['attemptId'] ?? '';
    const itemId = params['itemId'] ?? '';
    const assignmentId = params['assignmentId'] ?? '';

    switch (operationId) {
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
