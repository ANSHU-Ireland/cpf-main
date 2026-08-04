# External Actions Required

One consolidated list of credentials, legal/contractual decisions, signing keys and external
approvals that block specific workstreams. Independent work continues around these. Do not
re-ask the user repeatedly — add here instead.

| ID     | Blocker                                                        | Blocks                                                                                             | Severity | Safe interim behaviour                                                                                                                                                                                | Owner |
| ------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| EXT-01 | **Docker not installed** on this machine (`docker` not found). | Local Postgres/MinIO/mailcatcher containers; DB integration + RLS tests requiring a live Postgres. | High     | Domain/application/contract/UI work proceeds with pure logic + in-memory fakes. DB tests are authored but gated behind a `pg` availability check. Provide Docker Desktop or a reachable Postgres URL. | User  |
| EXT-02 | **Vercel credentials / project binding** absent.               | Protected Vercel preview deployment (Wave 18).                                                     | Medium   | Build + validated deploy config prepared; not deployed.                                                                                                                                               | User  |
| EXT-03 | **AWS account / IaC apply authority** absent.                  | Pilot/production infra apply (Wave 12/19).                                                         | Medium   | IaC + runbooks authored, never applied.                                                                                                                                                               | User  |
| EXT-04 | **AI provider API keys + vendor evidence** absent.             | Real model adapters (Wave 7).                                                                      | Medium   | Deterministic labelled fake provider used for all tests/demos; real adapters disabled.                                                                                                                | User  |
| EXT-05 | **Desktop code-signing / notarisation certificates** absent.   | Signed companion release (Wave 11).                                                                | Medium   | Unsigned local builds + signed-update architecture prepared.                                                                                                                                          | User  |
| EXT-06 | **Legal / DPO / DPIA / FRIA determinations** absent.           | Any compliance/"ready for production" claim.                                                       | High     | Implementation-aligned evidence authored; no compliance claims made.                                                                                                                                  | User  |
| EXT-07 | **Validated assessment-content pack** absent.                  | Validated-pilot requirement (Wave 3/5).                                                            | High     | Four `DEMO_NOT_VALIDATED` synthetic fixtures; assignment blocked in pilot/production.                                                                                                                 | User  |

## Notes for the user (consolidated ask)

To unblock the highest-value items when convenient:

1. Install **Docker Desktop** (or provide a Postgres connection string) — unblocks EXT-01.
2. Everything else (Vercel, AWS, AI keys, signing, legal, assessment validation) is only
   needed at later waves and does not block current foundation/domain work.
