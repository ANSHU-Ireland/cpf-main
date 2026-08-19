import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { PgAuditWriter } from '@cpf/audit';
import { withTenant, type TenantContext } from '@cpf/db';
import { AttemptSubmissionConflictError } from './attempts.js';
import type {
  ArtifactKind,
  AttemptAiMessageInput,
  AttemptAiMessageRecord,
  AttemptArtifactInput,
  AttemptArtifactRecord,
  AttemptBreakInput,
  AttemptBreakRecord,
  AttemptIncidentInput,
  AttemptIncidentRecord,
  AttemptItemFlagInput,
  AttemptItemFlagRecord,
  AttemptPluginExecuteInput,
  AttemptPluginExecutionRecord,
  AttemptPrecheckInput,
  AttemptPrecheckRecord,
  AttemptRecord,
  AttemptRepository,
  AttemptResponseInput,
  AttemptResponseRecord,
  AttemptSessionRecord,
  AttemptSessionSectionRecord,
  AttemptSessionTaskRecord,
  AttemptSubmissionPreviewRecord,
  AttemptStatus,
  IncidentType,
} from './attempts.js';
import type { Actor } from './types.js';

interface AttemptRow {
  id: string;
  application_id: string;
  assessment_version_id: string;
  status: string;
  started_at: Date | null;
  submitted_at: Date | null;
}

interface AttemptSessionRow extends AttemptRow {
  assessment_title: string;
  duration_seconds: number;
  remaining_seconds: number | null;
  row_version: number;
  server_now: Date;
  receipt_ref: string | null;
}

interface SessionTaskRow {
  id: string;
  section_id: string;
  section_title: string;
  section_display_order: number;
  item_type: string;
  title: string;
  prompt: unknown;
  display_order: number;
  response_json: { value?: unknown } | null;
  response_version: number | null;
  saved_at: Date | null;
  flagged: boolean | null;
  content_hash: string | null;
}

interface ResponseRow {
  attempt_id: string;
  assessment_item_id: string;
  response_json: { value?: unknown } | null;
  row_version: number;
  updated_at: Date;
}

interface FlagRow {
  attempt_id: string;
  assessment_item_id: string;
  flagged: boolean;
}

interface ArtifactRow {
  id: string;
  attempt_id: string;
  artifact_type: ArtifactKind;
  object_uri: string;
  created_at: Date;
}

interface BreakRow {
  id: string;
  attempt_id: string;
  reason: string | null;
  started_at: Date;
}

interface IncidentRow {
  id: string;
  attempt_id: string;
  incident_type: IncidentType;
  description: string;
  occurred_at: Date;
}

interface PrecheckRow {
  attempt_id: string;
  status: 'passed' | 'failed';
  checks: Record<string, boolean>;
}

interface AiMessageRow {
  id: string;
  attempt_id: string;
  role: string;
  content: { text?: string } | null;
  created_at: Date;
}

interface PluginExecutionRow {
  id: string;
  attempt_id: string;
  plugin_code: string;
  status: string;
  output_json: unknown;
}

interface SessionArtifactRow extends ArtifactRow {
  malware_scan_status: 'pending' | 'clean' | 'infected' | 'error';
}

interface SessionPluginExecutionRow extends PluginExecutionRow {
  input_json: unknown;
  started_at: Date;
}

function domainStatus(status: string): AttemptStatus {
  if (status === 'paused') return 'on_break';
  if (status === 'created' || status === 'in_progress' || status === 'submitted') return status;
  if (status === 'abandoned' || status === 'cancelled' || status === 'invalidated') {
    return 'abandoned';
  }
  return 'created';
}

function toAttempt(row: AttemptRow): AttemptRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    assessmentVersionId: row.assessment_version_id,
    status: domainStatus(row.status),
    startedAt: row.started_at?.toISOString() ?? null,
    submittedAt: row.submitted_at?.toISOString() ?? null,
  };
}

function toSessionTask(row: SessionTaskRow): AttemptSessionTaskRecord {
  const value = row.response_json?.value ?? '';
  const checksum =
    row.content_hash ?? createHash('sha256').update(JSON.stringify({ value })).digest('hex');
  return {
    id: row.id,
    sectionId: row.section_id,
    itemType: row.item_type,
    title: row.title,
    prompt: row.prompt,
    displayOrder: row.display_order,
    response: value,
    savedAt: row.saved_at?.toISOString() ?? null,
    flagged: row.flagged ?? false,
    version: row.response_version ?? 0,
    checksum: checksum.slice(0, 8),
  };
}

async function appendOutbox(
  client: PoolClient,
  actor: Actor,
  attemptId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `INSERT INTO audit.outbox_events
       (tenant_id, aggregate_type, aggregate_id, event_type, event_version, payload,
        data_classification, correlation_id, status)
     VALUES ($1, 'attempt', $2, $3, 1, $4::jsonb, 'confidential', $5, 'pending')`,
    [actor.tenantId, attemptId, eventType, JSON.stringify(payload), randomUUID()],
  );
}

async function appendMutationEvidence(
  client: PoolClient,
  actor: Actor,
  attemptId: string,
  action: string,
  eventType: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await new PgAuditWriter(client).append({
    tenantId: actor.tenantId,
    actorType: 'user',
    actorId: actor.userId,
    action,
    resourceType: 'attempt',
    resourceId: attemptId,
    outcome: 'success',
    metadata,
  });
  await appendOutbox(client, actor, attemptId, eventType, metadata);
}

const ATTEMPT_COLUMNS = `a.id, a.application_id, b.assessment_version_id,
  a.status, a.started_at, a.submitted_at`;

export class PgAttemptRepository implements AttemptRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: { role?: string } = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async getAttempt(actor: Actor, attemptId: string): Promise<AttemptSessionRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const attemptResult = await client.query<AttemptSessionRow>(
        `SELECT a.id, a.application_id, b.assessment_version_id, a.status, a.started_at,
                a.submitted_at, asm.title AS assessment_title, av.duration_seconds,
                a.remaining_seconds, a.row_version, now() AS server_now,
                submission.confirmation_code AS receipt_ref
           FROM runtime.attempts AS a
           JOIN runtime.attempt_version_bindings AS b ON b.attempt_id = a.id
           JOIN assessment.assessment_versions AS av ON av.id = b.assessment_version_id
           JOIN assessment.assessments AS asm ON asm.id = av.assessment_id
           LEFT JOIN runtime.submissions AS submission ON submission.attempt_id = a.id
          WHERE a.tenant_id = $1 AND a.id = $2`,
        [actor.tenantId, attemptId],
      );
      const row = attemptResult.rows[0];
      if (row === undefined) return null;

      const taskResult = await client.query<SessionTaskRow>(
        `SELECT item.id, section.id AS section_id, section.title AS section_title,
                section.display_order AS section_display_order, item.item_type, item.title,
                item.prompt, item.display_order, response.response_json,
                response.row_version AS response_version, response.updated_at AS saved_at,
                flag.flagged, latest_autosave.content_hash
           FROM assessment.assessment_sections AS section
           JOIN assessment.assessment_items AS item ON item.section_id = section.id
           LEFT JOIN runtime.responses AS response
             ON response.tenant_id = $1 AND response.attempt_id = $2
            AND response.assessment_item_id = item.id
           LEFT JOIN runtime.item_flags AS flag
             ON flag.tenant_id = $1 AND flag.attempt_id = $2
            AND flag.assessment_item_id = item.id
           LEFT JOIN LATERAL (
             SELECT autosave.content_hash
               FROM runtime.autosaves AS autosave
              WHERE autosave.tenant_id = $1 AND autosave.attempt_id = $2
                AND autosave.response_id = response.id
              ORDER BY autosave.server_received_at DESC, autosave.id DESC
              LIMIT 1
           ) AS latest_autosave ON true
          WHERE section.assessment_version_id = $3
          ORDER BY section.display_order, item.display_order`,
        [actor.tenantId, attemptId, row.assessment_version_id],
      );

      const [messageResult, artifactResult, pluginResult, breakResult] = await Promise.all([
        client.query<AiMessageRow>(
          `SELECT message.id, conversation.attempt_id, message.role, message.content,
                  message.created_at
             FROM evidence.ai_messages AS message
             JOIN evidence.ai_conversations AS conversation
               ON conversation.id = message.conversation_id
              AND conversation.tenant_id = message.tenant_id
            WHERE message.tenant_id = $1 AND conversation.attempt_id = $2
            ORDER BY message.created_at, message.sequence_no`,
          [actor.tenantId, attemptId],
        ),
        client.query<SessionArtifactRow>(
          `SELECT id, attempt_id, artifact_type, object_uri, created_at, malware_scan_status
             FROM runtime.artifacts
            WHERE tenant_id = $1 AND attempt_id = $2
            ORDER BY created_at, id`,
          [actor.tenantId, attemptId],
        ),
        client.query<SessionPluginExecutionRow>(
          `SELECT execution.id, execution.attempt_id, plugin.code AS plugin_code,
                  execution.status, execution.output_json, execution.input_json,
                  execution.started_at
             FROM evidence.plugin_executions AS execution
             JOIN assessment.plugin_registry AS plugin ON plugin.id = execution.plugin_id
            WHERE execution.tenant_id = $1 AND execution.attempt_id = $2
            ORDER BY execution.started_at, execution.id`,
          [actor.tenantId, attemptId],
        ),
        client.query<{ active: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM runtime.session_breaks
              WHERE tenant_id = $1 AND attempt_id = $2 AND ended_at IS NULL
           ) AS active`,
          [actor.tenantId, attemptId],
        ),
      ]);

      const sections = new Map<string, AttemptSessionSectionRecord>();
      const tasks = taskResult.rows.map((taskRow) => {
        sections.set(taskRow.section_id, {
          id: taskRow.section_id,
          title: taskRow.section_title,
          displayOrder: taskRow.section_display_order,
        });
        return toSessionTask(taskRow);
      });
      const activeTask = [...tasks]
        .filter((task) => task.savedAt !== null)
        .sort((left, right) => right.version - left.version)[0];
      const elapsedSeconds =
        row.status === 'in_progress' && row.started_at !== null
          ? Math.max(0, Math.floor((row.server_now.getTime() - row.started_at.getTime()) / 1000))
          : 0;
      const remainingSeconds = Math.max(
        0,
        Math.min(
          row.remaining_seconds ?? row.duration_seconds,
          row.status === 'in_progress'
            ? row.duration_seconds - elapsedSeconds
            : (row.remaining_seconds ?? row.duration_seconds),
        ),
      );

      return {
        ...toAttempt(row),
        assessmentTitle: row.assessment_title,
        remainingSeconds,
        rowVersion: row.row_version,
        serverNow: row.server_now.toISOString(),
        deadlineAt: new Date(row.server_now.getTime() + remainingSeconds * 1000).toISOString(),
        sections: [...sections.values()],
        tasks,
        activeItemId: activeTask?.id ?? tasks[0]?.id ?? null,
        receiptRef: row.receipt_ref,
        aiMessages: messageResult.rows.map((message) => ({
          id: message.id,
          attemptId: message.attempt_id,
          role: message.role,
          content: message.content?.text ?? '',
          createdAt: message.created_at.toISOString(),
        })),
        artifacts: artifactResult.rows.map((artifact) => ({
          id: artifact.id,
          attemptId: artifact.attempt_id,
          kind: artifact.artifact_type,
          uri: artifact.object_uri,
          createdAt: artifact.created_at.toISOString(),
          scanStatus: artifact.malware_scan_status,
        })),
        pluginExecutions: pluginResult.rows.map((execution) => ({
          id: execution.id,
          attemptId: execution.attempt_id,
          pluginCode: execution.plugin_code,
          status: execution.status,
          output: execution.output_json,
          input: execution.input_json,
          startedAt: execution.started_at.toISOString(),
        })),
        breakActive: breakResult.rows[0]?.active ?? false,
      };
    });
  }

  async getLatestPrecheck(actor: Actor, attemptId: string): Promise<AttemptPrecheckRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const result = await client.query<PrecheckRow>(
        `SELECT precheck.attempt_id, precheck.status, precheck.checks
           FROM runtime.precheck_runs AS precheck
           JOIN runtime.attempts AS attempt ON attempt.id = precheck.attempt_id
          WHERE precheck.tenant_id = $1
            AND precheck.attempt_id = $2
            AND attempt.tenant_id = precheck.tenant_id
          ORDER BY precheck.started_at DESC, precheck.id DESC
          LIMIT 1`,
        [actor.tenantId, attemptId],
      );
      const row = result.rows[0];
      return row === undefined
        ? null
        : { attemptId: row.attempt_id, passed: row.status === 'passed', checks: row.checks };
    });
  }

  async getSubmissionPreview(
    actor: Actor,
    attemptId: string,
  ): Promise<AttemptSubmissionPreviewRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const attempt = await client.query<{ id: string; status: string }>(
        `SELECT id, status FROM runtime.attempts WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, attemptId],
      );
      if (attempt.rows[0] === undefined) return null;
      const items = await client.query<{ id: string; completed: boolean }>(
        `SELECT item.id,
                response.id IS NOT NULL
                AND response.response_json ? 'value'
                AND length(trim(COALESCE(response.response_json->>'value', ''))) > 0 AS completed
           FROM runtime.attempt_version_bindings AS binding
           JOIN assessment.assessment_sections AS section
             ON section.assessment_version_id = binding.assessment_version_id
           JOIN assessment.assessment_items AS item ON item.section_id = section.id
      LEFT JOIN runtime.responses AS response
             ON response.tenant_id = $1
            AND response.attempt_id = binding.attempt_id
            AND response.assessment_item_id = item.id
          WHERE binding.tenant_id = $1 AND binding.attempt_id = $2
          ORDER BY section.display_order, item.display_order`,
        [actor.tenantId, attemptId],
      );
      const artifacts = await client.query<{ count: number; unsafe_count: number }>(
        `SELECT count(*) FILTER (WHERE malware_scan_status = 'clean')::int AS count,
                count(*) FILTER (WHERE malware_scan_status <> 'clean')::int AS unsafe_count
           FROM runtime.artifacts
          WHERE tenant_id = $1 AND attempt_id = $2`,
        [actor.tenantId, attemptId],
      );
      const incompleteItemIds = items.rows.filter((item) => !item.completed).map((item) => item.id);
      const blockers: string[] = [];
      if (!['in_progress', 'paused'].includes(attempt.rows[0].status)) {
        blockers.push('attempt_not_submittable');
      }
      if (incompleteItemIds.length > 0) blockers.push('responses_incomplete');
      if ((artifacts.rows[0]?.unsafe_count ?? 0) > 0) blockers.push('artifact_scan_incomplete');
      return {
        attemptId,
        ready: blockers.length === 0,
        incompleteItemIds,
        blockers,
        responseCount: items.rows.length - incompleteItemIds.length,
        artifactCount: artifacts.rows[0]?.count ?? 0,
      };
    });
  }

  async startAttempt(actor: Actor, attemptId: string): Promise<AttemptRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const result = await client.query<AttemptRow>(
        `UPDATE runtime.attempts AS a
            SET status = 'in_progress', started_at = COALESCE(a.started_at, now()),
                row_version = a.row_version + 1, updated_at = now()
           FROM runtime.attempt_version_bindings AS b
          WHERE a.tenant_id = $1 AND a.id = $2 AND b.attempt_id = a.id
            AND a.status IN ('created', 'precheck', 'ready', 'paused')
        RETURNING ${ATTEMPT_COLUMNS}`,
        [actor.tenantId, attemptId],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await appendMutationEvidence(client, actor, attemptId, 'attempt.start', 'attempt.started', {
        status: 'in_progress',
      });
      return toAttempt(row);
    });
  }

  async submitAttempt(actor: Actor, attemptId: string): Promise<AttemptRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const locked = await client.query<AttemptRow>(
        `SELECT ${ATTEMPT_COLUMNS}
           FROM runtime.attempts AS a
           JOIN runtime.attempt_version_bindings AS b ON b.attempt_id = a.id
          WHERE a.tenant_id = $1 AND a.id = $2
          FOR UPDATE OF a`,
        [actor.tenantId, attemptId],
      );
      const current = locked.rows[0];
      if (current === undefined) return null;
      if (current.status === 'submitted') return toAttempt(current);
      if (!['in_progress', 'paused'].includes(current.status)) {
        throw new AttemptSubmissionConflictError('The attempt is not in a submittable state.');
      }

      const incomplete = await client.query<{ count: number }>(
        `SELECT count(*)::int AS count
           FROM runtime.attempt_version_bindings AS binding
           JOIN assessment.assessment_sections AS section
             ON section.assessment_version_id = binding.assessment_version_id
           JOIN assessment.assessment_items AS item ON item.section_id = section.id
      LEFT JOIN runtime.responses AS response
             ON response.tenant_id = $1
            AND response.attempt_id = binding.attempt_id
            AND response.assessment_item_id = item.id
          WHERE binding.tenant_id = $1
            AND binding.attempt_id = $2
            AND (
              response.id IS NULL
              OR NOT (response.response_json ? 'value')
              OR length(trim(COALESCE(response.response_json->>'value', ''))) = 0
            )`,
        [actor.tenantId, attemptId],
      );
      if ((incomplete.rows[0]?.count ?? 0) > 0) {
        throw new AttemptSubmissionConflictError(
          'Every required assessment item must have a response before submission.',
        );
      }

      const manifestResult = await client.query<{
        binding_hash: string;
        response_ids: string[];
        artifact_ids: string[];
      }>(
        `SELECT binding.binding_hash,
                ARRAY(
                  SELECT response.id::text FROM runtime.responses AS response
                   WHERE response.tenant_id = $1 AND response.attempt_id = $2
                   ORDER BY response.assessment_item_id
                ) AS response_ids,
                ARRAY(
                  SELECT artifact.id::text FROM runtime.artifacts AS artifact
                   WHERE artifact.tenant_id = $1 AND artifact.attempt_id = $2
                   ORDER BY artifact.id
                ) AS artifact_ids
           FROM runtime.attempt_version_bindings AS binding
          WHERE binding.tenant_id = $1 AND binding.attempt_id = $2`,
        [actor.tenantId, attemptId],
      );
      const manifestSource = manifestResult.rows[0];
      if (manifestSource === undefined) return null;
      const manifest = {
        bindingHash: manifestSource.binding_hash,
        responseIds: manifestSource.response_ids,
        artifactIds: manifestSource.artifact_ids,
      };
      const manifestHash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
      const confirmationCode = `CPF-${randomUUID().toUpperCase()}`;
      await client.query(
        `INSERT INTO runtime.submissions
           (tenant_id, attempt_id, manifest, manifest_hash, status, submitted_at,
            confirmation_code)
         VALUES ($1, $2, $3::jsonb, $4, 'submitted', now(), $5)
         ON CONFLICT (attempt_id) DO NOTHING`,
        [actor.tenantId, attemptId, JSON.stringify(manifest), manifestHash, confirmationCode],
      );
      await client.query(
        `UPDATE runtime.responses SET state = 'final'
          WHERE tenant_id = $1 AND attempt_id = $2`,
        [actor.tenantId, attemptId],
      );
      const result = await client.query<AttemptRow>(
        `UPDATE runtime.attempts AS a
            SET status = 'submitted', submitted_at = COALESCE(a.submitted_at, now()),
                row_version = a.row_version + 1, updated_at = now()
           FROM runtime.attempt_version_bindings AS b
          WHERE a.tenant_id = $1 AND a.id = $2 AND b.attempt_id = a.id
        RETURNING ${ATTEMPT_COLUMNS}`,
        [actor.tenantId, attemptId],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await appendMutationEvidence(
        client,
        actor,
        attemptId,
        'attempt.submit',
        'attempt.submitted',
        {
          submittedAt: row.submitted_at?.toISOString() ?? null,
          manifestHash,
          confirmationCode,
        },
      );
      return toAttempt(row);
    });
  }

  async saveResponse(
    actor: Actor,
    attemptId: string,
    itemId: string,
    input: AttemptResponseInput,
  ): Promise<AttemptResponseRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const responseJson = JSON.stringify({ value: input.value });
      const result = await client.query<ResponseRow>(
        `INSERT INTO runtime.responses
           (tenant_id, attempt_id, assessment_item_id, response_json, state)
         SELECT $1, a.id, $3, $4::jsonb, 'draft'
           FROM runtime.attempts AS a
           JOIN assessment.assessment_items AS i ON i.id = $3
          WHERE a.tenant_id = $1 AND a.id = $2 AND a.status IN ('in_progress', 'paused')
         ON CONFLICT (attempt_id, assessment_item_id) DO UPDATE
             SET response_json = EXCLUDED.response_json,
                 state = 'draft',
                 row_version = runtime.responses.row_version + 1,
                 updated_at = now()
       RETURNING attempt_id, assessment_item_id, response_json, row_version, updated_at`,
        [actor.tenantId, attemptId, itemId, responseJson],
      );
      const row = result.rows[0];
      if (row === undefined) return null;

      const contentHash = createHash('sha256').update(responseJson).digest('hex');
      await client.query(
        `INSERT INTO runtime.autosaves
           (tenant_id, attempt_id, response_id, client_sequence, content_hash, delta)
         SELECT $1, $2, r.id, $3, $4, $5::jsonb
           FROM runtime.responses AS r
          WHERE r.tenant_id = $1 AND r.attempt_id = $2 AND r.assessment_item_id = $6
         ON CONFLICT (attempt_id, client_sequence) DO NOTHING`,
        [actor.tenantId, attemptId, row.row_version, contentHash, responseJson, itemId],
      );
      await appendMutationEvidence(
        client,
        actor,
        attemptId,
        'attempt.response.save',
        'attempt.response.saved',
        { itemId, rowVersion: row.row_version, contentHash },
      );
      return {
        attemptId: row.attempt_id,
        itemId: row.assessment_item_id,
        value: row.response_json?.value,
        savedAt: row.updated_at.toISOString(),
      };
    });
  }

  async flagItem(
    actor: Actor,
    attemptId: string,
    itemId: string,
    input: AttemptItemFlagInput,
  ): Promise<AttemptItemFlagRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const result = await client.query<FlagRow>(
        `INSERT INTO runtime.item_flags (tenant_id, attempt_id, assessment_item_id, flagged)
         SELECT $1, a.id, $3, $4
           FROM runtime.attempts AS a
           JOIN assessment.assessment_items AS i ON i.id = $3
          WHERE a.tenant_id = $1 AND a.id = $2
         ON CONFLICT (attempt_id, assessment_item_id) DO UPDATE
             SET flagged = EXCLUDED.flagged, updated_at = now()
       RETURNING attempt_id, assessment_item_id, flagged`,
        [actor.tenantId, attemptId, itemId, input.flagged],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await appendMutationEvidence(
        client,
        actor,
        attemptId,
        'attempt.item_flag.update',
        'attempt.item_flag.updated',
        { itemId, flagged: row.flagged },
      );
      return { attemptId: row.attempt_id, itemId: row.assessment_item_id, flagged: row.flagged };
    });
  }

  async addPrecheck(
    actor: Actor,
    attemptId: string,
    input: AttemptPrecheckInput,
  ): Promise<AttemptPrecheckRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const passed = Object.values(input.checks).every(Boolean);
      const result = await client.query<PrecheckRow>(
        `INSERT INTO runtime.precheck_runs
           (tenant_id, attempt_id, status, checks, started_at, completed_at)
         SELECT $1, a.id, $3, $4::jsonb, now(), now()
           FROM runtime.attempts AS a
          WHERE a.tenant_id = $1 AND a.id = $2
       RETURNING attempt_id, status, checks`,
        [actor.tenantId, attemptId, passed ? 'passed' : 'failed', JSON.stringify(input.checks)],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await appendMutationEvidence(
        client,
        actor,
        attemptId,
        'attempt.precheck.record',
        'attempt.precheck.recorded',
        {
          passed,
        },
      );
      return { attemptId: row.attempt_id, passed: row.status === 'passed', checks: row.checks };
    });
  }

  async startBreak(
    actor: Actor,
    attemptId: string,
    input: AttemptBreakInput,
  ): Promise<AttemptBreakRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const result = await client.query<BreakRow>(
        `WITH target AS (
           UPDATE runtime.attempts
              SET status = 'paused', row_version = row_version + 1, updated_at = now()
            WHERE tenant_id = $1 AND id = $2 AND status = 'in_progress'
        RETURNING id
         )
         INSERT INTO runtime.session_breaks
           (tenant_id, attempt_id, break_type, requested_by, started_at, timer_policy, reason)
         SELECT $1, id, 'scheduled', $3, now(), '{"timer":"paused"}'::jsonb, $4
           FROM target
       RETURNING id, attempt_id, reason, started_at`,
        [actor.tenantId, attemptId, actor.userId, input.reason],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await appendMutationEvidence(
        client,
        actor,
        attemptId,
        'attempt.break.start',
        'attempt.break.started',
        {
          breakId: row.id,
          reason: input.reason,
        },
      );
      return {
        id: row.id,
        attemptId: row.attempt_id,
        reason: row.reason ?? input.reason,
        startedAt: row.started_at.toISOString(),
      };
    });
  }

  async recordIncident(
    actor: Actor,
    attemptId: string,
    input: AttemptIncidentInput,
  ): Promise<AttemptIncidentRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const description = input.detail ?? input.incidentType.replaceAll('_', ' ');
      const result = await client.query<IncidentRow>(
        `INSERT INTO evidence.technical_incidents
           (tenant_id, attempt_id, incident_type, source, severity, description,
            telemetry, status, occurred_at)
         SELECT $1, a.id, $3, 'candidate', 'low', $4, '{}'::jsonb, 'open', now()
           FROM runtime.attempts AS a
          WHERE a.tenant_id = $1 AND a.id = $2
       RETURNING id, attempt_id, incident_type, description, occurred_at`,
        [actor.tenantId, attemptId, input.incidentType, description],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await appendMutationEvidence(
        client,
        actor,
        attemptId,
        'attempt.incident.record',
        'attempt.incident.recorded',
        {
          incidentId: row.id,
          incidentType: row.incident_type,
        },
      );
      return {
        id: row.id,
        attemptId: row.attempt_id,
        incidentType: row.incident_type,
        detail: input.detail ?? null,
        recordedAt: row.occurred_at.toISOString(),
      };
    });
  }

  async addArtifact(
    actor: Actor,
    attemptId: string,
    input: AttemptArtifactInput,
  ): Promise<AttemptArtifactRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const sha256 = createHash('sha256').update(input.uri).digest('hex');
      const result = await client.query<ArtifactRow>(
        `INSERT INTO runtime.artifacts
           (tenant_id, attempt_id, artifact_type, object_uri, sha256, size_bytes,
            malware_scan_status, source)
         SELECT $1, a.id, $3, $4, $5, 0, 'pending', 'candidate'
           FROM runtime.attempts AS a
          WHERE a.tenant_id = $1 AND a.id = $2
       RETURNING id, attempt_id, artifact_type, object_uri, created_at`,
        [actor.tenantId, attemptId, input.kind, input.uri, sha256],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await appendMutationEvidence(
        client,
        actor,
        attemptId,
        'attempt.artifact.add',
        'attempt.artifact.added',
        {
          artifactId: row.id,
          kind: row.artifact_type,
          sha256,
        },
      );
      return {
        id: row.id,
        attemptId: row.attempt_id,
        kind: row.artifact_type,
        uri: row.object_uri,
        createdAt: row.created_at.toISOString(),
      };
    });
  }

  async deleteArtifact(actor: Actor, attemptId: string, artifactId: string): Promise<boolean> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const result = await client.query<{ id: string }>(
        `DELETE FROM runtime.artifacts
          WHERE tenant_id = $1 AND attempt_id = $2 AND id = $3
      RETURNING id`,
        [actor.tenantId, attemptId, artifactId],
      );
      if (result.rows[0] === undefined) return false;
      await appendMutationEvidence(
        client,
        actor,
        attemptId,
        'attempt.artifact.delete',
        'attempt.artifact.deleted',
        {
          artifactId,
        },
      );
      return true;
    });
  }

  async postAiMessage(
    actor: Actor,
    attemptId: string,
    input: AttemptAiMessageInput,
  ): Promise<AttemptAiMessageRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const result = await client.query<AiMessageRow>(
        `WITH active_conversation AS (
           SELECT c.id
             FROM evidence.ai_conversations AS c
            WHERE c.tenant_id = $1 AND c.attempt_id = $2 AND c.status = 'active'
            ORDER BY c.started_at DESC
            LIMIT 1
         ), next_sequence AS (
           SELECT c.id AS conversation_id,
                  COALESCE(max(m.sequence_no), 0) + 1 AS sequence_no
             FROM active_conversation AS c
             LEFT JOIN evidence.ai_messages AS m ON m.conversation_id = c.id
            GROUP BY c.id
         )
         INSERT INTO evidence.ai_messages
           (tenant_id, conversation_id, sequence_no, role, content)
         SELECT $1, conversation_id, sequence_no, 'candidate', $3::jsonb
           FROM next_sequence
       RETURNING id, $2::uuid AS attempt_id, role, content, created_at`,
        [actor.tenantId, attemptId, JSON.stringify({ text: input.content })],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await appendMutationEvidence(
        client,
        actor,
        attemptId,
        'attempt.ai_message.post',
        'attempt.ai_message.posted',
        {
          messageId: row.id,
        },
      );
      return {
        id: row.id,
        attemptId: row.attempt_id,
        role: row.role,
        content: row.content?.text ?? input.content,
        createdAt: row.created_at.toISOString(),
      };
    });
  }

  async resetAi(actor: Actor, attemptId: string): Promise<AttemptRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const exists = await client.query<AttemptRow>(
        `SELECT ${ATTEMPT_COLUMNS}
           FROM runtime.attempts AS a
           JOIN runtime.attempt_version_bindings AS b ON b.attempt_id = a.id
          WHERE a.tenant_id = $1 AND a.id = $2`,
        [actor.tenantId, attemptId],
      );
      const row = exists.rows[0];
      if (row === undefined) return null;
      await client.query(
        `UPDATE evidence.ai_conversations
            SET status = 'closed', ended_at = COALESCE(ended_at, now())
          WHERE tenant_id = $1 AND attempt_id = $2 AND status = 'active'`,
        [actor.tenantId, attemptId],
      );
      await appendMutationEvidence(
        client,
        actor,
        attemptId,
        'attempt.ai.reset',
        'attempt.ai.reset',
        {},
      );
      return toAttempt(row);
    });
  }

  async executePlugin(
    actor: Actor,
    attemptId: string,
    pluginCode: string,
    input: AttemptPluginExecuteInput,
  ): Promise<AttemptPluginExecutionRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const result = await client.query<PluginExecutionRow>(
        `INSERT INTO evidence.plugin_executions
           (tenant_id, attempt_id, plugin_id, action, input_json, output_json,
            status, started_at, completed_at)
         SELECT $1, a.id, p.id, 'execute', $4::jsonb, NULL,
                'requested', now(), NULL
           FROM runtime.attempts AS a
           JOIN assessment.plugin_registry AS p ON p.code = $3 AND p.status = 'active'
          WHERE a.tenant_id = $1 AND a.id = $2
       RETURNING id, attempt_id, $3::text AS plugin_code, status, output_json`,
        [actor.tenantId, attemptId, pluginCode, JSON.stringify(input.input ?? {})],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      await appendMutationEvidence(
        client,
        actor,
        attemptId,
        'attempt.plugin.execute',
        'attempt.plugin.requested',
        {
          executionId: row.id,
          pluginCode,
        },
      );
      return {
        id: row.id,
        attemptId: row.attempt_id,
        pluginCode: row.plugin_code,
        status: row.status,
        output: row.output_json,
      };
    });
  }
}
