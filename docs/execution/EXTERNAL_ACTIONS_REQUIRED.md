# External Actions Required

One consolidated list of credentials, legal/contractual decisions, signing keys and external
approvals that block specific workstreams. Independent work continues around these. Do not
re-ask the user repeatedly — add here instead.

| ID     | Blocker                                                                                                                                                                  | Blocks                                         | Severity          | Safe interim behaviour                                                                                                               | Owner           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| EXT-01 | ~~Docker not installed~~ **RESOLVED 2026-08-04** — local PostgreSQL 18.4 (`postgresql-x64-18`) reachable; `cpf_dev` created, baseline applied, 3 schema/RLS tests green. | ~~DB integration/RLS tests~~                   | ~~High~~ Resolved | `DATABASE_URL` set in gitignored `.env`; CI has a `postgres:16` service job. Docker still optional for MinIO/mailcatcher (deferred). | User → **done** |
| EXT-02 | **Vercel credentials / project binding** absent.                                                                                                                         | Protected Vercel preview deployment (Wave 18). | Medium            | Build + validated deploy config prepared; not deployed.                                                                              | User            |
| EXT-03 | **AWS account / IaC apply authority** absent.                                                                                                                            | Pilot/production infra apply (Wave 12/19).     | Medium            | IaC + runbooks authored, never applied.                                                                                              | User            |
| EXT-04 | **AI provider API keys + vendor evidence** absent.                                                                                                                       | Real model adapters (Wave 7).                  | Medium            | Deterministic labelled fake provider used for all tests/demos; real adapters disabled.                                               | User            |
| EXT-05 | **Desktop code-signing / notarisation certificates** absent.                                                                                                             | Signed companion release (Wave 11).            | Medium            | Unsigned local builds + signed-update architecture prepared.                                                                         | User            |
| EXT-06 | **Legal / DPO / DPIA / FRIA determinations** absent.                                                                                                                     | Any compliance/"ready for production" claim.   | High              | Implementation-aligned evidence authored; no compliance claims made.                                                                 | User            |
| EXT-07 | **Validated assessment-content pack** absent.                                                                                                                            | Validated-pilot requirement (Wave 3/5).        | High              | Four `DEMO_NOT_VALIDATED` synthetic fixtures; assignment blocked in pilot/production.                                                | User            |

## Notes for the user (consolidated ask)

**EXT-01 is resolved** (local Postgres connected). Remaining items are later-wave only.

To unblock the highest-value items when convenient:

1. Install **Docker Desktop** (or provide a Postgres connection string) — unblocks EXT-01.
2. Everything else (Vercel, AWS, AI keys, signing, legal, assessment validation) is only
   needed at later waves and does not block current foundation/domain work.
