# Additive decision context read — 2026-09-06

The immutable 244-operation OpenAPI baseline is unchanged. The runtime separately registers
`GET /applications/{applicationId}/decision-context` to support the existing employer decision
and independent-approval screens without fixed demo credentials or direct web database access.

- Operation ID: `get_applications_applicationId_decision_context`.
- Authentication: normal expiring bearer session (web forwards its HttpOnly session cookie).
- Authorization: existing decision-read policy; tenant-scoped employer admin or approver.
- Storage: existing `PgDecisionRepository.getDecisionContext`, with tenant RLS. No new table.
- Success: 200 with `applicationId`, `candidateRef`, `campaignName`, `reviewComplete`, `decision`
  (nullable canonical record) and `approval` (nullable canonical record).
- Errors: 401 invalid session, 403 wrong role, 404 absent or other-tenant application, 422 invalid
  UUID, 503 unavailable database. It does not manufacture data for arbitrary IDs.
- No mutation or approval occurs on read. Draft, approve/return and issue remain separate baseline
  commands with their existing distinct-person and role policies, idempotency and audit/outbox.

This closes a web read-model transport gap; it does not amend the source-of-truth baseline or
claim that every product contract gap is resolved. Runtime inventory includes baseline plus
explicit additive operations so health/route reporting remains accurate.
