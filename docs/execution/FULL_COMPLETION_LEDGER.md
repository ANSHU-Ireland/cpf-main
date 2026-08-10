# CPF full completion ledger

Date: 2026-08-10

This ledger is the executable completion record for the v2.0 handover. It reconciles the product requirements pack, developer TRD, 125-interface Penpot handoff, 244-operation OpenAPI contract, PostgreSQL baseline and current monorepo. A workstream is complete only when its implementation, automated verification and evidence are all present.

## Source contract

| Source                    |                        Normative volume | Current control                                                |
| ------------------------- | --------------------------------------: | -------------------------------------------------------------- |
| Product requirements pack |              362 requirements, 336 Must | release traceability and journey acceptance                    |
| Penpot handoff            |                125 canonical interfaces | route inventory plus visual/interaction QA                     |
| OpenAPI baseline          |                          244 operations | generated contracts plus server dispatch coverage              |
| PostgreSQL baseline       | 139 physical tables, 138 logical tables | migration/schema facts, RLS and repository coverage            |
| Developer TRD             |        18 technical/governance sections | architecture, security, privacy, reliability and release gates |

## Programme status

| Stage  | Scope                                                         | Status      | Exit evidence                                                                                                                       |
| ------ | ------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| CPF-01 | Source reconciliation and canonical route inventory           | Complete    | 125/125 canonical routes asserted from the live handoff CSV                                                                         |
| CPF-02 | Shared shell, tokens and canonical account/auth routes        | Complete    | typecheck, build, browser QA and `design-qa.md`                                                                                     |
| CPF-03 | Candidate runtime RUN-02 vertical slice                       | Complete    | five realistic tasks; timer, save, version/checksum, flag and next-task interaction                                                 |
| CPF-04 | Reviewer scorecard REV-08 vertical slice                      | Complete    | evidence-led human scoring, citation, insufficient-evidence rationale and concealed AI observations                                 |
| CPF-05 | Remaining interface fidelity and interaction closure          | In progress | all 125 routes require route-specific ready/empty/error/denied and primary interaction evidence                                     |
| CPF-06 | Replace web process-local stores with authenticated API calls | In progress | RUN-02, REV-08, campaign lifecycle and EMP-10 candidate import use scoped sessions and PostgreSQL; remaining routes are pending     |
| CPF-07 | Wire 244 OpenAPI operations to concrete handlers              | In progress | runtime, scorecard, campaign, candidate-detail, invitation-command and all six candidate-import operations are concrete             |
| CPF-08 | PostgreSQL repositories and transaction/outbox coverage       | In progress | runtime, scorecard, campaign, invitation and import writes have tenant-scoped audit/outbox evidence; remaining repositories pending |
| CPF-09 | Identity, sessions, MFA, RBAC/ABAC and tenant isolation       | In progress | runtime/review/employer slices enforce 401/403 and scoped resources; MFA and full negative suites are pending                       |
| CPF-10 | Worker, integration, notification and webhook runtime         | Not started | retry/idempotency/dead-letter/replay protection evidence                                                                            |
| CPF-11 | Governed AI/tool gateway and evidence ledger                  | Not started | disabled-by-default gateway, provenance, budget, safety, version and outage gates                                                   |
| CPF-12 | Desktop companion and governed telemetry                      | Not started | signed/version-gated client, allow-list, recovery and privacy evidence                                                              |
| CPF-13 | Deterministic PostgreSQL demo seed                            | In progress | seed creates runtime/review data, three campaigns, four candidates/applications/invitations and three scoped sessions               |
| CPF-14 | Security, privacy, accessibility and resilience closure       | Not started | release-gate suite, evidence references and independent findings resolved                                                           |
| CPF-15 | Deployment/IaC/operations and controlled-pilot package        | Not started | reproducible deployment, backup/restore, rollback, monitoring and runbooks                                                          |

## Current deterministic demo scenario

All visible identities and records are synthetic. The web scenario now includes:

- Northstar Logistics tenant and distinct candidate, reviewer, employer, admin, support and governance workspaces.
- Candidate attempt `att_frontend_demo` with five tasks across saved, in-progress and not-started states.
- Server-issued deadline, autosave state, response version and display-safe checksum projection.
- Reviewer assignment `asg_frontend_demo`, three source evidence objects and five rubric criteria.
- A pre-saved human score, source citation, concealed AI observations, open integrity signal, training and availability states.
- Employer campaigns, candidates, invitations, scheduling, accommodations, review allocation, decisions and reports.
- Four tenant-local candidate/application/invitation records spanning active, invited, accepted, completed, withdrawn and expired states.
- An EMP-10 four-step import fixture with four fabricated emails, encrypted staging, row-level correction/exclusion and idempotent commit.
- Platform tenants, releases, jobs, flags, support access, governance registers, risks, incidents and evidence collections.

The canonical RUN-02 candidate flow, REV-08 human criterion scorecard and employer campaign list/detail/lifecycle now read and write through the explicit demo API into PostgreSQL. Candidate-detail reads and the contract-defined invitation create/resend/extend/revoke commands are also concrete, session-protected PostgreSQL operations. EMP-10 now executes the complete contract-defined candidate-import state machine: upload, preview, row listing, correction/exclusion, commit and cancel. Import values are AES-GCM encrypted at rest in staging; candidate records use hashed external references; raw emails never enter audit or outbox payloads. The repositories apply tenant context, write audit records and enqueue transactional outbox events atomically. The server resolves hashed, expiring candidate/reviewer/admin sessions from IAM tables and checks the resource scope before domain authorization. Live probes prove missing credentials return 401, assigned employer resources return 200, and cross-role access returns 403. Browser verification proves responses, flags, rubric scores, rationales and campaign transitions rehydrate from PostgreSQL with `ai_observation_id` remaining null. Invitation command verification records four audit events and four outbox events for the complete lifecycle; candidate-import verification proves encrypted preview, row correction and completed candidate/application creation with matching audit/outbox evidence. The Northstar seed remains idempotent at two attempts, six responses, one reviewer assignment, three criterion scores, three campaigns, four candidates, four applications, four invitations and three active scoped sessions.

The employer candidate-directory and invitation list still use an explicitly labelled synthetic projection because the supplied OpenAPI baseline has no tenant candidate-list or invitation-read operation. This formal contract gap remains visible rather than being hidden behind an invented public endpoint. The remaining role journeys also still use process-local synthetic state. CPF-06 and CPF-13 therefore remain active release blockers rather than completed programme stages.

## Release blockers

1. The generic server dispatcher now has concrete runtime, scorecard, campaign, candidate-detail, invitation-command and candidate-import operations, but the remaining OpenAPI operations still return compatibility responses instead of invoking every `apps/api` handler.
2. RUN-02, REV-08, employer campaigns and candidate import are persistent and session-protected; the remaining web routes and read models still use process-local synthetic stores.
3. Session, role and resource-scope enforcement is proven for RUN-02, REV-08 and the employer campaign/candidate/invitation operations; MFA and the remaining API/browser journeys still need end-to-end enforcement.
4. Worker/outbox publishing, integrations, governed AI/tool adapters and desktop companion are incomplete.
5. Traceability rows still require executable evidence for every Must requirement.
6. Independent security, accessibility, human-factors, privacy/legal and controlled-pilot approvals are outside the current evidence set.

## Completion rule

The product is not production-ready until CPF-01 through CPF-15 are complete, `pnpm verify` and the production build pass, the OpenAPI/schema/route/requirement coverage reports have no unexplained gaps, and the legal/compliance release approvals named in the handover are recorded against the exact build.
