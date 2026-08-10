import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import {
  CandidateImportConflictError,
  type CandidateImportRepository,
  type ImportJobCreate,
  type ImportJobRecord,
  type ImportJobStatus,
  type ImportRowAction,
  type ImportRowListResult,
  type ImportRowRecord,
  type ImportRowStatus,
  type ImportRowUpdate,
} from './candidate-imports.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENCRYPTION_VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;

interface ImportCounts {
  readonly totalRows: number;
  readonly validRows: number;
  readonly errorRows: number;
}

interface ImportJobRow {
  readonly id: string;
  readonly campaign_id: string;
  readonly source_object_uri: string | null;
  readonly status: ImportJobStatus;
  readonly counts: unknown;
  readonly created_at: Date;
  readonly completed_at: Date | null;
}

interface ImportRowDb {
  readonly id: string;
  readonly row_number: number;
  readonly encrypted_input: Buffer;
  readonly validation_errors: unknown;
  readonly action: ImportRowAction;
  readonly candidate_id: string | null;
  readonly status: ImportRowStatus;
}

interface CandidateMatchRow {
  readonly id: string;
}

export interface PgCandidateImportRepositoryOptions {
  readonly role?: string;
  readonly dataKey: string;
}

export class AesGcmCandidateImportCodec {
  readonly #key: Buffer;

  constructor(secret: string) {
    if (secret.trim().length < 16) {
      throw new Error('Candidate import data key must contain at least 16 characters.');
    }
    this.#key = createHash('sha256').update(secret, 'utf8').digest();
  }

  encode(value: string): Buffer {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.#key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return Buffer.concat([Buffer.from([ENCRYPTION_VERSION]), iv, cipher.getAuthTag(), ciphertext]);
  }

  decode(value: Buffer): string {
    const version = value[0];
    if (version !== ENCRYPTION_VERSION || value.length < 1 + IV_BYTES + TAG_BYTES) {
      throw new Error('Unsupported candidate import encryption payload.');
    }
    const iv = value.subarray(1, 1 + IV_BYTES);
    const tag = value.subarray(1 + IV_BYTES, 1 + IV_BYTES + TAG_BYTES);
    const ciphertext = value.subarray(1 + IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', this.#key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}

function parseCounts(value: unknown): ImportCounts {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { totalRows: 0, validRows: 0, errorRows: 0 };
  }
  const counts = value as Record<string, unknown>;
  return {
    totalRows: Number(counts['totalRows'] ?? 0),
    validRows: Number(counts['validRows'] ?? 0),
    errorRows: Number(counts['errorRows'] ?? 0),
  };
}

function parseErrors(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function fileNameFromUri(uri: string | null): string {
  if (uri === null) return 'candidate-import.csv';
  const separator = uri.lastIndexOf('/');
  const encoded = separator === -1 ? uri : uri.slice(separator + 1);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function toJob(row: ImportJobRow): ImportJobRecord {
  const counts = parseCounts(row.counts);
  return {
    id: row.id,
    campaignId: row.campaign_id,
    status: row.status,
    fileName: fileNameFromUri(row.source_object_uri),
    ...counts,
    createdAt: row.created_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
  };
}

function maskValue(value: string): string {
  const at = value.indexOf('@');
  if (at <= 0) return value.length <= 2 ? '••' : `${value[0] ?? ''}•••`;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  return `${local[0] ?? ''}${'•'.repeat(Math.min(6, Math.max(2, local.length - 1)))}@${domain}`;
}

function toImportRow(row: ImportRowDb, codec: AesGcmCandidateImportCodec): ImportRowRecord {
  return {
    id: row.id,
    rowNumber: row.row_number,
    displayValue: maskValue(codec.decode(row.encrypted_input)),
    validationErrors: parseErrors(row.validation_errors),
    action: row.action,
    duplicateCandidateId: row.candidate_id,
    status: row.status,
  };
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function emailHash(value: string): string {
  return createHash('sha256').update(normalizeEmail(value), 'utf8').digest('hex');
}

async function findCandidateByEmail(
  client: PoolClient,
  tenantId: string,
  email: string,
): Promise<string | null> {
  const result = await client.query<CandidateMatchRow>(
    `SELECT id
       FROM hiring.candidates
      WHERE tenant_id = $1 AND external_reference = $2
      ORDER BY created_at
      LIMIT 1`,
    [tenantId, `import:${emailHash(email)}`],
  );
  return result.rows[0]?.id ?? null;
}

function validateEmail(
  email: string,
  duplicateCandidateId: string | null,
  action: ImportRowAction,
): readonly string[] {
  if (!EMAIL_RE.test(email)) return ['Enter a valid email address.'];
  if (duplicateCandidateId !== null && action === 'include') {
    return ['An existing candidate uses this email. Choose merge, keep separate or exclude.'];
  }
  return [];
}

function rowStatus(errors: readonly string[], action: ImportRowAction): ImportRowStatus {
  if (action === 'exclude') return 'excluded';
  return errors.length === 0 ? 'valid' : 'invalid';
}

async function appendImportOutbox(
  client: PoolClient,
  actor: Actor,
  importId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `INSERT INTO audit.outbox_events
       (tenant_id, aggregate_type, aggregate_id, event_type, event_version, payload,
        data_classification, correlation_id, status)
     VALUES ($1, 'candidate_import', $2, $3, 1, $4::jsonb, 'confidential', $5, 'pending')`,
    [actor.tenantId, importId, eventType, JSON.stringify(payload), randomUUID()],
  );
}

async function refreshCounts(
  client: PoolClient,
  actor: Actor,
  importId: string,
): Promise<ImportCounts> {
  const result = await client.query<{
    total_rows: number;
    valid_rows: number;
    error_rows: number;
  }>(
    `SELECT count(*)::int AS total_rows,
            count(*) FILTER (WHERE status IN ('valid', 'committed'))::int AS valid_rows,
            count(*) FILTER (WHERE status IN ('invalid', 'failed'))::int AS error_rows
       FROM hiring.candidate_import_rows
      WHERE tenant_id = $1 AND import_job_id = $2`,
    [actor.tenantId, importId],
  );
  const row = result.rows[0];
  const counts = {
    totalRows: row?.total_rows ?? 0,
    validRows: row?.valid_rows ?? 0,
    errorRows: row?.error_rows ?? 0,
  };
  await client.query(
    `UPDATE hiring.candidate_import_jobs
        SET counts = $3::jsonb
      WHERE tenant_id = $1 AND id = $2`,
    [actor.tenantId, importId, JSON.stringify(counts)],
  );
  return counts;
}

const JOB_COLUMNS = 'id, campaign_id, source_object_uri, status, counts, created_at, completed_at';
const ROW_COLUMNS =
  'id, row_number, encrypted_input, validation_errors, action, candidate_id, status';

export class PgCandidateImportRepository implements CandidateImportRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;
  readonly #codec: AesGcmCandidateImportCodec;

  constructor(pool: Pool, options: PgCandidateImportRepositoryOptions) {
    this.#pool = pool;
    this.#role = options.role;
    this.#codec = new AesGcmCandidateImportCodec(options.dataKey);
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async createJob(actor: Actor, input: ImportJobCreate): Promise<ImportJobRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
        `${actor.tenantId}:${input.idempotencyKey}`,
      ]);
      const existing = await client.query<ImportJobRow>(
        `SELECT ${JOB_COLUMNS}
           FROM hiring.candidate_import_jobs
          WHERE tenant_id = $1 AND idempotency_key = $2`,
        [actor.tenantId, input.idempotencyKey],
      );
      const existingJob = existing.rows[0];
      if (existingJob !== undefined) {
        if (
          existingJob.campaign_id !== input.campaignId ||
          fileNameFromUri(existingJob.source_object_uri) !== input.fileName
        ) {
          throw new CandidateImportConflictError(
            'The Idempotency-Key was already used for a different candidate import.',
          );
        }
        return toJob(existingJob);
      }

      const rows = input.rows
        .map((value, index) => ({ value: normalizeEmail(value), rowNumber: index + 1 }))
        .filter((row) => row.value.length > 0);
      if (rows.length === 0) {
        throw new CandidateImportConflictError('The file does not contain any candidate rows.');
      }

      const inserted = await client.query<ImportJobRow>(
        `INSERT INTO hiring.candidate_import_jobs
           (tenant_id, campaign_id, created_by, idempotency_key, source_object_uri, status, counts)
         VALUES ($1, $2, $3, $4, $5, 'validating', '{}'::jsonb)
         RETURNING ${JOB_COLUMNS}`,
        [
          actor.tenantId,
          input.campaignId,
          actor.userId,
          input.idempotencyKey,
          `candidate-import://${encodeURIComponent(input.fileName)}`,
        ],
      );
      const job = inserted.rows[0];
      if (job === undefined) throw new Error('candidate import job missing after insert');

      const seen = new Set<string>();
      for (const row of rows) {
        const duplicateInFile = seen.has(row.value);
        seen.add(row.value);
        const duplicateCandidateId = EMAIL_RE.test(row.value)
          ? await findCandidateByEmail(client, actor.tenantId, row.value)
          : null;
        const errors = duplicateInFile
          ? ['Duplicate email in this import. Exclude the duplicate or keep it separate.']
          : validateEmail(row.value, duplicateCandidateId, 'include');
        await client.query(
          `INSERT INTO hiring.candidate_import_rows
             (tenant_id, import_job_id, row_number, encrypted_input, validation_errors,
              action, candidate_id, status)
           VALUES ($1, $2, $3, $4, $5::jsonb, 'include', $6, $7)`,
          [
            actor.tenantId,
            job.id,
            row.rowNumber,
            this.#codec.encode(row.value),
            JSON.stringify(errors),
            duplicateCandidateId,
            rowStatus(errors, 'include'),
          ],
        );
      }

      const counts = await refreshCounts(client, actor, job.id);
      const ready = await client.query<ImportJobRow>(
        `UPDATE hiring.candidate_import_jobs
            SET status = 'preview_ready'
          WHERE tenant_id = $1 AND id = $2
         RETURNING ${JOB_COLUMNS}`,
        [actor.tenantId, job.id],
      );
      const readyJob = ready.rows[0];
      if (readyJob === undefined) throw new Error('candidate import job missing after validation');

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'candidate_import.create',
        resourceType: 'candidate_import',
        resourceId: job.id,
        outcome: 'success',
        metadata: { campaignId: input.campaignId, fileName: input.fileName, ...counts },
      });
      await appendImportOutbox(client, actor, job.id, 'candidate_import.preview_ready', {
        campaignId: input.campaignId,
        ...counts,
      });
      return toJob(readyJob);
    });
  }

  async getJob(actor: Actor, id: string): Promise<ImportJobRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const result = await client.query<ImportJobRow>(
        `SELECT ${JOB_COLUMNS}
           FROM hiring.candidate_import_jobs
          WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      const row = result.rows[0];
      return row === undefined ? null : toJob(row);
    });
  }

  async listRows(actor: Actor, id: string, limit: number): Promise<ImportRowListResult | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const exists = await client.query(
        `SELECT 1 FROM hiring.candidate_import_jobs WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      if (exists.rows[0] === undefined) return null;
      const totalResult = await client.query<{ count: number }>(
        `SELECT count(*)::int AS count
           FROM hiring.candidate_import_rows
          WHERE tenant_id = $1 AND import_job_id = $2`,
        [actor.tenantId, id],
      );
      const result = await client.query<ImportRowDb>(
        `SELECT ${ROW_COLUMNS}
           FROM hiring.candidate_import_rows
          WHERE tenant_id = $1 AND import_job_id = $2
          ORDER BY row_number
          LIMIT $3`,
        [actor.tenantId, id, limit],
      );
      return {
        items: result.rows.map((row) => toImportRow(row, this.#codec)),
        total: totalResult.rows[0]?.count ?? 0,
      };
    });
  }

  async updateRow(
    actor: Actor,
    importId: string,
    rowId: string,
    input: ImportRowUpdate,
  ): Promise<ImportRowRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const job = await client.query<{ status: ImportJobStatus }>(
        `SELECT status
           FROM hiring.candidate_import_jobs
          WHERE tenant_id = $1 AND id = $2
          FOR UPDATE`,
        [actor.tenantId, importId],
      );
      const jobStatus = job.rows[0]?.status;
      if (jobStatus === undefined) return null;
      if (jobStatus !== 'preview_ready') {
        throw new CandidateImportConflictError('Only a preview-ready import can be corrected.');
      }

      const current = await client.query<ImportRowDb>(
        `SELECT ${ROW_COLUMNS}
           FROM hiring.candidate_import_rows
          WHERE tenant_id = $1 AND import_job_id = $2 AND id = $3
          FOR UPDATE`,
        [actor.tenantId, importId, rowId],
      );
      const existing = current.rows[0];
      if (existing === undefined) return null;
      const value = normalizeEmail(input.value ?? this.#codec.decode(existing.encrypted_input));
      const duplicateCandidateId = EMAIL_RE.test(value)
        ? await findCandidateByEmail(client, actor.tenantId, value)
        : null;
      const errors = validateEmail(value, duplicateCandidateId, input.action);
      const updated = await client.query<ImportRowDb>(
        `UPDATE hiring.candidate_import_rows
            SET encrypted_input = $4,
                validation_errors = $5::jsonb,
                action = $6,
                candidate_id = $7,
                status = $8,
                updated_at = now()
          WHERE tenant_id = $1 AND import_job_id = $2 AND id = $3
         RETURNING ${ROW_COLUMNS}`,
        [
          actor.tenantId,
          importId,
          rowId,
          this.#codec.encode(value),
          JSON.stringify(errors),
          input.action,
          duplicateCandidateId,
          rowStatus(errors, input.action),
        ],
      );
      const row = updated.rows[0];
      if (row === undefined) return null;
      const counts = await refreshCounts(client, actor, importId);
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'candidate_import.row_update',
        resourceType: 'candidate_import_row',
        resourceId: row.id,
        outcome: 'success',
        metadata: { importId, rowNumber: row.row_number, action: row.action, ...counts },
      });
      await appendImportOutbox(client, actor, importId, 'candidate_import.row_updated', {
        rowId: row.id,
        rowNumber: row.row_number,
        action: row.action,
        status: row.status,
      });
      return toImportRow(row, this.#codec);
    });
  }

  async commitJob(actor: Actor, id: string): Promise<ImportJobRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const locked = await client.query<ImportJobRow>(
        `SELECT ${JOB_COLUMNS}
           FROM hiring.candidate_import_jobs
          WHERE tenant_id = $1 AND id = $2
          FOR UPDATE`,
        [actor.tenantId, id],
      );
      const job = locked.rows[0];
      if (job === undefined) return null;
      if (job.status === 'completed' || job.status === 'partial') return toJob(job);
      if (job.status !== 'preview_ready') {
        throw new CandidateImportConflictError('Only a preview-ready import can be committed.');
      }

      const rows = await client.query<ImportRowDb>(
        `SELECT ${ROW_COLUMNS}
           FROM hiring.candidate_import_rows
          WHERE tenant_id = $1 AND import_job_id = $2
          ORDER BY row_number
          FOR UPDATE`,
        [actor.tenantId, id],
      );
      if (rows.rows.some((row) => row.status === 'invalid' || row.status === 'failed')) {
        throw new CandidateImportConflictError(
          'Resolve or exclude every invalid row before commit.',
        );
      }
      await client.query(
        `UPDATE hiring.candidate_import_jobs SET status = 'committing'
          WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );

      for (const row of rows.rows) {
        if (row.action === 'exclude' || row.status === 'excluded') continue;
        const email = normalizeEmail(this.#codec.decode(row.encrypted_input));
        let candidateId = row.action === 'merge' ? row.candidate_id : null;
        if (candidateId === null) {
          const referenceSuffix =
            row.action === 'keep_separate' ? `${emailHash(email)}:${row.id}` : emailHash(email);
          const candidate = await client.query<{ id: string }>(
            `WITH inserted AS (
               INSERT INTO hiring.candidates (tenant_id, external_reference, status)
               VALUES ($1, $2, 'active')
               ON CONFLICT (tenant_id, external_reference) DO NOTHING
               RETURNING id
             )
             SELECT id FROM inserted
             UNION ALL
             SELECT id FROM hiring.candidates
              WHERE tenant_id = $1 AND external_reference = $2
             LIMIT 1`,
            [actor.tenantId, `import:${referenceSuffix}`],
          );
          candidateId = candidate.rows[0]?.id ?? null;
          if (candidateId === null) throw new Error('candidate missing after import upsert');
        }

        const application = await client.query<{ id: string }>(
          `WITH inserted AS (
             INSERT INTO hiring.applications
               (tenant_id, campaign_id, candidate_id, status, source, source_reference)
             VALUES ($1, $2, $3, 'created', 'candidate_import', $4)
             ON CONFLICT (campaign_id, candidate_id) DO NOTHING
             RETURNING id
           )
           SELECT id FROM inserted
           UNION ALL
           SELECT id FROM hiring.applications
            WHERE tenant_id = $1 AND campaign_id = $2 AND candidate_id = $3
           LIMIT 1`,
          [actor.tenantId, job.campaign_id, candidateId, `candidate-import:${id}:${row.id}`],
        );
        const applicationId = application.rows[0]?.id;
        if (applicationId === undefined) throw new Error('application missing after import upsert');
        await client.query(
          `UPDATE hiring.candidate_import_rows
              SET candidate_id = $4, application_id = $5, status = 'committed', updated_at = now()
            WHERE tenant_id = $1 AND import_job_id = $2 AND id = $3`,
          [actor.tenantId, id, row.id, candidateId, applicationId],
        );
      }

      const counts = await refreshCounts(client, actor, id);
      const completed = await client.query<ImportJobRow>(
        `UPDATE hiring.candidate_import_jobs
            SET status = 'completed', completed_at = now()
          WHERE tenant_id = $1 AND id = $2
         RETURNING ${JOB_COLUMNS}`,
        [actor.tenantId, id],
      );
      const completedJob = completed.rows[0];
      if (completedJob === undefined) throw new Error('candidate import job missing after commit');
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'candidate_import.commit',
        resourceType: 'candidate_import',
        resourceId: id,
        outcome: 'success',
        metadata: { campaignId: job.campaign_id, ...counts },
      });
      await appendImportOutbox(client, actor, id, 'candidate_import.completed', {
        campaignId: job.campaign_id,
        ...counts,
      });
      return toJob(completedJob);
    });
  }

  async cancelJob(actor: Actor, id: string): Promise<ImportJobRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const locked = await client.query<ImportJobRow>(
        `SELECT ${JOB_COLUMNS}
           FROM hiring.candidate_import_jobs
          WHERE tenant_id = $1 AND id = $2
          FOR UPDATE`,
        [actor.tenantId, id],
      );
      const job = locked.rows[0];
      if (job === undefined) return null;
      if (job.status === 'cancelled') return toJob(job);
      if (job.status === 'completed' || job.status === 'partial') {
        throw new CandidateImportConflictError('A committed import cannot be cancelled.');
      }
      const cancelled = await client.query<ImportJobRow>(
        `UPDATE hiring.candidate_import_jobs
            SET status = 'cancelled', completed_at = now()
          WHERE tenant_id = $1 AND id = $2
         RETURNING ${JOB_COLUMNS}`,
        [actor.tenantId, id],
      );
      const cancelledJob = cancelled.rows[0];
      if (cancelledJob === undefined) throw new Error('candidate import job missing after cancel');
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'candidate_import.cancel',
        resourceType: 'candidate_import',
        resourceId: id,
        outcome: 'success',
        metadata: { campaignId: job.campaign_id },
      });
      await appendImportOutbox(client, actor, id, 'candidate_import.cancelled', {
        campaignId: job.campaign_id,
      });
      return toJob(cancelledJob);
    });
  }
}
