# Demo screen and action coverage — 2026-09-05 checkpoint

## Update — 2026-09-06

Three mutation gaps below have since been connected to canonical persistence: employer decision,
employer approval/issue, and governance QMS draft creation. The historical table is retained as
the inspected baseline, not the current closure count. This leaves **26 of the 29 listed mutation
handlers** plus the **five no-op handlers** still open in this subset. See
`DEMO_CHECKPOINT_2026-09-06.md` for verification and remaining limitations.

This is a bounded source inspection of checkpoint `479e5725a14e036606f1f8f6ec5557d66a35d70f`,
not a claim that all 125 Penpot interfaces have passed UAT. It follows active web API routes that
call `contractGapResponse`, their shared demo fallback, and the corresponding API-client/page
callers. Counts below describe that subset only; they are not a percentage of product completion.

## Measured result

- **46 route files** call `contractGapResponse`.
- **27 route files contain 29 mutation handlers** with no implemented demo mutation. Valid
  requests still reach HTTP 501 with `CPF_DEMO_MODE=true`.
- **Five additional demo mutation handlers return HTTP 204 without changing state.** A success
  response is therefore not proof that their action works after a reload.
- Shared GET fixtures cover the inspected gap reads. A route without its own demo branch is
  not necessarily a blank screen: `contractGapResponse` invokes the shared GET fallback.
- Those fixtures are mostly fixed examples, not projections of each tenant's seeded database.
  They do not establish that all 30 tenants, records, fields, and lifecycle states are represented.
- The security screen's demo read explicitly returns `incidents: []` and an inactive kill switch.
  It lacks a populated incident journey even though the GET itself succeeds.

The shared fallback accepts GET only. It cannot make a POST, PATCH, or DELETE functional.
Read examples also remain available where the screen's write payload omits required canonical
fields. This explains how a screen can look populated and still fail when its primary action is used.

## Mutation handlers with no functional demo implementation

All endpoint paths below are web adapters under `/api`. Unless indicated otherwise, their reads
have synthetic examples; the listed mutations return 501. The existing route message describes
the current implementation gap, not a new approval request to the user.

| Screen                                     | Unimplemented endpoint                          | Missing action or data connection                                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/tenants/[id]/staff`                | `POST /api/admin/tenants/[id]/staff`            | Invite tenant staff from platform context; persist tenant, user, role and membership instead of only displaying the shared staff fixture.                                    |
| `/admin/privileged-access`                 | `POST /api/admin/privileged-access`             | Request a grant with tenant, subject, scope, purpose, case and expiry. The current directory displays fixed grants.                                                          |
| `/admin/privileged-access`                 | `PATCH /api/admin/privileged-access`            | Approve or revoke the selected grant and reload its new lifecycle state.                                                                                                     |
| `/admin/assessments/[id]`                  | `PATCH /api/admin/assessments/[id]`             | Assessment lifecycle/status change. Its GET already reads the platform; a status control must use the governed version lifecycle.                                            |
| `/employer/campaigns/[id]/preflight`       | `POST /api/employer/campaigns/[id]/preflight`   | The screen's Resolve action attempts a manual override that the adapter rejects. Route the user to each authoritative missing record and refresh the real preflight result.  |
| `/employer/scheduling`                     | `POST /api/employer/scheduling`                 | Add a campaign scheduling window; connect campaign, dates, timezone and capacity to actual booking availability.                                                             |
| `/employer/reviewers`                      | `POST /api/employer/reviewers`                  | Invite a reviewer and reload the tenant directory; current form sends name and discipline only.                                                                              |
| `/employer/assignments`                    | `POST /api/employer/assignments`                | Assign a reviewer using stable campaign, application and reviewer identities; current board uses a reviewer name.                                                            |
| `/employer/applications/[id]/decision`     | `POST /api/employer/applications/[id]/decision` | Save a human decision with its application context, stable decision ID, rationale and evidence links. The shared GET returns the same example for arbitrary application IDs. |
| `/employer/applications/[id]/approval`     | `POST /api/employer/applications/[id]/approval` | Approve or return the application's real decision, enforce the distinct approver and refresh the resulting state.                                                            |
| `/employer/reports`                        | `POST /api/employer/reports`                    | Generate a report tied to a known submission and show the resulting report/artifact in the catalogue.                                                                        |
| GOV-02 `/governance/classifications`       | `POST /api/governance/classifications`          | Record the legal snapshot, Article reviews and structured role evidence; reload the selected system's classification.                                                        |
| GOV-04 `/governance/datasets`              | `POST /api/governance/datasets`                 | Register a dataset with role, quality, bias, gaps, licence, retention and storage evidence. The current four-field form does not express the canonical record.               |
| GOV-05 `/governance/technical-docs`        | `POST /api/governance/technical-docs`           | Create a versioned Annex IV document with its protected object URI, SHA-256 and complete manifest; connect the existing canonical document seed to the screen.               |
| GOV-06 `/governance/qms`                   | `POST /api/governance/qms`                      | Create a QMS document version with content URI and hash, beyond the current title/policy form.                                                                               |
| GOV-07 `/governance/data-use`              | `POST /api/governance/data-use`                 | Record controller roles, storage, transfers, rights, security and model use; project the canonical register into the screen.                                                 |
| GOV-08 `/governance/impact-assessments`    | `POST /api/governance/impact-assessments`       | Capture necessity, structured risks, measures, residual risks, consultation and approval; load the assessment for the selected system and type.                              |
| GOV-09 `/governance/oversight`             | `POST /api/governance/oversight`                | Persist the authority, competence, stopping rules and approval checkpoint, then read it back for that system.                                                                |
| GOV-10 `/governance/deployer-instructions` | `POST /api/governance/deployer-instructions`    | Publish a versioned artifact with accuracy metrics, monitoring, incident and maintenance instructions.                                                                       |
| GOV-11 `/governance/ai-literacy`           | `POST /api/governance/ai-literacy`              | Assign training with assignee identity, material version, competence outcome and evidence; refresh the persisted assignment.                                                 |
| GOV-12 `/governance/conformity`            | `POST /api/governance/conformity`               | Record the procedure, release version, structured requirement results and authorized outcome. The current read is an example marked conformant.                              |
| GOV-13 `/governance/market-access`         | `POST /api/governance/market-access`            | Record declaration, registration or CE-marking evidence and lifecycle identifiers. Demo artifacts must be clearly synthetic and must not assert actual regulatory approval.  |
| GOV-14 `/governance/post-market`           | `POST /api/governance/post-market`              | Save versioned methodology, structured signal catalogue and approval; reload the system's current plan.                                                                      |
| GOV-15 `/governance/signals`               | `POST /api/governance/signals`                  | Create a signal linked to a plan, metric window, measured value, source and review lifecycle.                                                                                |
| GOV-17 `/governance/vendors`               | `POST /api/governance/vendors`                  | Record legal roles, locations, subprocessors, security/model evidence, retention, audit and exit evidence.                                                                   |
| GOV-18 `/governance/changes`               | `POST /api/governance/changes`                  | Submit a canonical change-impact record and reload it in the directory.                                                                                                      |
| GOV-18 `/governance/changes`               | `POST /api/governance/changes/[id]`             | Record a decision against the actual change request and reload its authoritative state.                                                                                      |
| OPS-02 `/operations/incident`              | `POST /api/operations/kill-switch`              | Activate the controlled switch and persist its reason, scope and lifecycle; no implementation exists in the demo handler.                                                    |
| OPS-02 `/operations/incident`              | `DELETE /api/operations/kill-switch`            | Deactivate and refresh the switch state; no implementation exists in the demo handler.                                                                                       |

The 29 rows above map to 27 route files because privileged access and the kill switch each
export two unimplemented mutation methods.

## Demo actions that acknowledge without changing state

| Screen                          | Endpoint                                       | Observed implementation                                    | Required verification                                                              |
| ------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| SUP-03 `/support/access`        | `POST /api/support/jit-access`                 | Validates scope/justification, discards them, returns 204. | Create a visible grant with a real lifecycle; reload and restart must preserve it. |
| SUP-03 `/support/access`        | `POST /api/support/jit-access/[id]/revoke`     | Extracts then discards session ID, returns 204.            | The selected session becomes revoked; an unrelated session is unchanged.           |
| OPS-01 `/operations`            | `POST /api/operations/alerts/[id]/acknowledge` | Extracts then discards alert ID, returns 204.              | Reload shows only the selected alert acknowledged.                                 |
| OPS-02 `/operations/incident`   | `POST /api/operations/incidents/[id]/escalate` | Extracts then discards incident ID, returns 204.           | Seed a visible incident and persist its escalation/history.                        |
| OPS-03 `/operations/deliveries` | `POST /api/operations/deliveries/[id]/retry`   | Extracts then discards delivery ID, returns 204.           | A retry creates a delivery attempt and updates status/history.                     |

Other inspected demo actions do mutate module-level example arrays: candidate creation,
invitations, risks, serious incidents and support messages. That is more than an acknowledgment,
but it is still not evidence of database persistence, restart survival, or isolation across 30 tenants.

## Highest-value next work for a hosted dummy-data demo

1. Connect governance screen reads to the canonical documents already seeded per tenant, then
   implement complete forms and writes for the 16 governance handlers above. Prioritize datasets,
   technical documents, QMS, data use, literacy, vendors and signals where the browser still uses
   shared examples despite existing canonical repositories.
2. Finish the employer decision-to-approval journey and its supporting reviewer assignment,
   scheduling and report actions. Verify one completed journey with separate users, then verify
   another tenant cannot see or change those records.
3. Replace the five no-op actions with persisted state transitions and add populated security
   incidents, failed/retried deliveries and active/revoked access examples. Test reload and restart,
   not only the HTTP success code.

For the user's requirement of dummy data in all fields, follow this with a field/state matrix for
every screen: required and optional display fields, empty/populated/error states, cross-links and
each primary action. This inspection did not enumerate every database column or prove coverage
of every Penpot interface. Seeding a nullable field blindly is not a substitute for realistic linked
records and working actions.

## Evidence and scope

- [Shared contract-gap boundary](../../apps/web/app/lib/contract-gap.server.ts)
- [Shared demo fixtures and GET dispatch](../../apps/web/app/lib/demo-contracts.server.ts)
- [Screen API-client methods](../../apps/web/app/lib/api-client.ts)
- [Web API route tree](../../apps/web/app/api)
- [30-tenant database seed](../../packages/db/seeds/uat-30-tenants.sql)
- [Completion ledger](./FULL_COMPLETION_LEDGER.md)

The source scan used `rg -l contractGapResponse apps/web/app/api`, enumerated exported HTTP
handlers, read their route bodies and shared fallback, and mapped action names to page callers.
The measured count log is `2026-09-05_23-36-14-407-measure-demo-mutation-gap-counts.log`
in the task's external timestamped log directory. No new browser UAT was performed for this
inventory.

GitHub CI for the exact inspected checkpoint completed successfully on both
[run 33996043947](https://github.com/ANSHU-Ireland/cpf-main/actions/runs/33996043947) and
[run 33996042620](https://github.com/ANSHU-Ireland/cpf-main/actions/runs/33996042620).
Passing CI does not resolve the action gaps measured above.
