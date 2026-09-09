import type { GovernanceDocRecord } from '@cpf/org';

export interface QmsDocument {
  readonly id: string;
  readonly title: string;
  readonly documentCode: string;
  readonly versionNo: number | null;
  readonly documentType: string;
  readonly policy: string;
  readonly contentUri: string;
  readonly sha256: string;
  readonly status: string;
  readonly ownerUserId: string;
  readonly approvedBy: string;
  readonly reviewDue: string;
  readonly updatedAt: string;
}

export interface QmsCreateInput {
  readonly title: string;
  readonly documentCode: string;
  readonly versionNo: number;
  readonly documentType: string;
  readonly policy: string;
  readonly contentUri: string;
  readonly sha256: string;
  readonly reviewDue: string;
  readonly reason: string;
}

export function projectQmsDocument(doc: GovernanceDocRecord): QmsDocument {
  const text = (key: string) =>
    typeof doc.data[key] === 'string' ? (doc.data[key] as string) : '';
  return {
    id: doc.id,
    title: doc.title,
    status: doc.status,
    updatedAt: doc.updatedAt,
    documentCode: text('documentCode'),
    versionNo: typeof doc.data.versionNo === 'number' ? doc.data.versionNo : null,
    documentType: text('documentType'),
    policy: text('policy'),
    contentUri: text('contentUri'),
    sha256: text('sha256'),
    ownerUserId: text('ownerUserId'),
    approvedBy: text('approvedBy'),
    reviewDue: text('reviewDue'),
  };
}

export function parseQmsCreate(
  raw: unknown,
):
  | { readonly ok: true; readonly value: QmsCreateInput }
  | { readonly ok: false; readonly detail: string } {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, detail: 'Enter the QMS document details.' };
  }
  const body = raw as Record<string, unknown>;
  const text = (key: string) => (typeof body[key] === 'string' ? body[key].trim() : '');
  const title = text('title');
  const documentCode = text('documentCode');
  const documentType = text('documentType');
  const reason = text('reason');
  if (
    title.length < 4 ||
    !documentCode ||
    !documentType ||
    reason.length < 4 ||
    reason.length > 2000
  ) {
    return {
      ok: false,
      detail:
        'Provide a document code, type, and at least four characters for the title and reason (reason maximum: 2,000).',
    };
  }
  if (
    !Number.isSafeInteger(body.versionNo) ||
    Number(body.versionNo) < 1 ||
    Number(body.versionNo) > 2147483647
  ) {
    return { ok: false, detail: 'Version must be a positive whole number.' };
  }
  const contentUri = text('contentUri');
  try {
    const uri = new URL(contentUri);
    if (
      !['https:', 's3:'].includes(uri.protocol) ||
      !uri.hostname ||
      !uri.pathname ||
      uri.pathname === '/' ||
      uri.username ||
      uri.password
    )
      throw new Error('Invalid URI');
  } catch {
    return {
      ok: false,
      detail:
        'Provide the HTTPS or S3 reference of an existing protected document, without embedded credentials.',
    };
  }
  const sha256 = text('sha256').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    return {
      ok: false,
      detail: 'Provide the document’s actual SHA-256 checksum (64 hexadecimal characters).',
    };
  }
  const reviewDue = text('reviewDue');
  if (
    reviewDue &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(reviewDue) ||
      !Number.isFinite(Date.parse(reviewDue)) ||
      new Date(reviewDue).toISOString().slice(0, 10) !== reviewDue)
  ) {
    return { ok: false, detail: 'Review due must be a valid calendar date.' };
  }
  return {
    ok: true,
    value: {
      title,
      documentCode,
      versionNo: Number(body.versionNo),
      documentType,
      reason,
      policy: text('policy'),
      contentUri,
      sha256,
      reviewDue,
    },
  };
}
