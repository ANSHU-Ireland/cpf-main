import pg from 'pg';
import process from 'node:process';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const collectionId = process.env.CPF_AUDIT_COLLECTION_ID;
if (typeof connectionString !== 'string' || connectionString === '') {
  throw new Error('DATABASE_URL is required.');
}
if (typeof collectionId !== 'string' || collectionId === '') {
  throw new Error('CPF_AUDIT_COLLECTION_ID is required.');
}

const pool = new Pool({ connectionString });
try {
  const result = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM audit.evidence_collections
         WHERE id = $1) AS collections,
       (SELECT count(*)::int FROM audit.evidence_custody_events
         WHERE collection_id = $1) AS custody_events,
       (SELECT count(*)::int FROM audit.events
         WHERE resource_id = $1 AND action = 'evidence_collection.create') AS audit_events,
       (SELECT count(*)::int FROM audit.outbox_events
         WHERE aggregate_id = $1
           AND event_type = 'audit.evidence_collection.created') AS outbox_events`,
    [collectionId],
  );
  const evidence = result.rows[0];
  if (
    evidence?.collections !== 1 ||
    evidence.custody_events !== 1 ||
    evidence.audit_events !== 1 ||
    evidence.outbox_events !== 1
  ) {
    throw new Error(`Collection transaction evidence is incomplete: ${JSON.stringify(evidence)}`);
  }
  process.stdout.write(`${JSON.stringify({ collectionId, ...evidence }, null, 2)}\n`);
} finally {
  await pool.end();
}
