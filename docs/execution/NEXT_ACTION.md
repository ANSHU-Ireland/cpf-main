# Next Action — exactly one executable slice

## Reconcile governance-document persistence

**Goal:** replace the remaining invented generic document mappings in `PgGovernanceDocRepository`
with canonical, tenant-isolated PostgreSQL behavior and explicit fail-closed outcomes.

1. Reconcile every governance-document query with the canonical quality, governance and audit table
   columns; remove assumptions that every resource has generic `title`, `status`, `created_at` and
   `updated_at` fields.
2. Preserve accepted operation payload evidence additively only where the baseline has no canonical
   field, with tenant RLS and least-privilege grants.
3. Return `null` or an explicit unsupported outcome for missing/unsafe mutation targets; never
   manufacture a successful record.
4. Add live PostgreSQL tests for each mapped document family, audit/outbox evidence and cross-tenant
   denial.
5. Rerun `pnpm verify`, the complete live PostgreSQL suite, the 97-page production build and the
   244-operation contract regeneration check.

After this slice, continue with assessment traceability, candidate profile-correction/explanation/
human-review persistence, then candidate merge preview/reversal. Each currently has either an
invented column mapping or an audit-only/fabricated success path.

**Completion condition:** governance-document operations use verified canonical persistence, have
tenant-negative live evidence, and all repository gates finish with zero unexplained skips or
failures.
