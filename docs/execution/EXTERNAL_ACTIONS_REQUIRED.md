# External Actions Required

One consolidated list of credentials, legal/contractual decisions, signing keys and external
approvals that block specific workstreams. Independent work continues around these. Do not
re-ask the user repeatedly — add here instead.

| ID     | Blocker                                                                                                                                                                                     | Blocks                                         | Severity | Safe interim behaviour                                                                                                           | Owner |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- | ----- |
| EXT-01 | **Local PostgreSQL resolved; Docker remains absent.** PostgreSQL 18 is available and the complete DB suite runs. Docker is still required to validate/run the production container locally. | Local container verification                   | Medium   | CI builds the production image; local type, build, DB and browser UAT gates run without Docker.                                  | User  |
| EXT-02 | **Vercel credentials / project binding** absent.                                                                                                                                            | Protected Vercel preview deployment (Wave 18). | Medium   | Build + validated deploy config prepared; not deployed.                                                                          | User  |
| EXT-03 | **AWS CLI, AWS account/IaC authority and Docker are absent on this workstation.**                                                                                                           | UAT/pilot/production AWS stack apply.          | Medium   | CloudFormation, immutable deploy script, seed/live gates and runbooks are authored and pass YAML plus `cfn-lint`; never applied. | User  |
| EXT-04 | **AI provider API keys + vendor evidence** absent.                                                                                                                                          | Real model adapters (Wave 7).                  | Medium   | Deterministic labelled fake provider used for all tests/demos; real adapters disabled.                                           | User  |
| EXT-05 | **Desktop code-signing / notarisation certificates** absent.                                                                                                                                | Signed companion release (Wave 11).            | Medium   | Unsigned local builds + signed-update architecture prepared.                                                                     | User  |
| EXT-06 | **Legal / DPO / DPIA / FRIA determinations** absent.                                                                                                                                        | Any compliance/"ready for production" claim.   | High     | Implementation-aligned evidence authored; no compliance claims made.                                                             | User  |
| EXT-07 | **Validated assessment-content pack** absent.                                                                                                                                               | Validated-pilot requirement (Wave 3/5).        | High     | Four `DEMO_NOT_VALIDATED` synthetic fixtures; assignment blocked in pilot/production.                                            | User  |

## Notes for the user (consolidated ask)

**EXT-01 is resolved** (local Postgres connected). Remaining items are later-wave only.

To unblock the highest-value items when convenient:

1. Install Docker Desktop and AWS CLI v2, then provide an approved AWS role/profile to apply the UAT
   stack using `docs/deployment/AWS_UAT_RUNBOOK.md`.
2. Vercel, AI keys, signing, legal and assessment validation remain later release gates and do not
   block repository-local UAT engineering.
