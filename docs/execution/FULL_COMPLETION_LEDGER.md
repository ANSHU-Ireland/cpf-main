# CPF full completion ledger

Date: 2026-08-21

This ledger is the executable completion record for the v2.0 handover. It reconciles the product requirements pack, developer TRD, 125-interface Penpot handoff, 244-operation OpenAPI contract, PostgreSQL baseline and current monorepo. A workstream is complete only when its implementation, automated verification and evidence are all present.

## Source contract

| Source                    |                              Normative volume | Current control                                                |
| ------------------------- | --------------------------------------------: | -------------------------------------------------------------- |
| Product requirements pack |                    362 requirements, 336 Must | release traceability and journey acceptance                    |
| Penpot handoff            |                      125 canonical interfaces | route inventory plus visual/interaction QA                     |
| OpenAPI baseline          |                                244 operations | generated contracts plus server dispatch coverage              |
| PostgreSQL baseline       | 139 physical / 138 logical; current 143 / 142 | migration/schema facts, RLS and repository coverage            |
| Developer TRD             |              18 technical/governance sections | architecture, security, privacy, reliability and release gates |

## Programme status

| Stage  | Scope                                                         | Status      | Exit evidence                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CPF-01 | Source reconciliation and canonical route inventory           | Complete    | 125/125 canonical routes derived directly from the tracked handoff SVGs; no ignored generated file dependency                                                                                       |
| CPF-02 | Shared shell, tokens and canonical account/auth routes        | Complete    | typecheck, build, browser QA and `design-qa.md`                                                                                                                                                     |
| CPF-03 | Candidate runtime RUN-02 vertical slice                       | Complete    | five realistic tasks; timer, save, version/checksum, flag and next-task interaction                                                                                                                 |
| CPF-04 | Reviewer scorecard REV-08 vertical slice                      | Complete    | evidence-led human scoring, citation, insufficient-evidence rationale and concealed AI observations                                                                                                 |
| CPF-05 | Remaining interface fidelity and interaction closure          | In progress | EMP-20/21 now join the verified slices; all 125 routes still require route-specific ready/empty/error/denied evidence                                                                               |
| CPF-06 | Replace web process-local stores with authenticated API calls | In progress | no app route/page imports the obsolete stores; implemented journeys use authenticated APIs and unsupported contract combinations fail closed with 501; formal read-model/API gaps remain            |
| CPF-07 | Wire 244 OpenAPI operations to concrete handlers              | In progress | executable classification test covers 244/244; candidate merge preview gap fixed; operation-specific semantic/E2E proof remains                                                                     |
| CPF-08 | PostgreSQL repositories and transaction/outbox coverage       | In progress | full live checkpoint: 174 files / 1,622 tests, including 10 focused adapter tests for audit exports, maintenance, governance submissions, platform staff, privileged access and integration secrets |
| CPF-09 | Identity, sessions, MFA, RBAC/ABAC and tenant isolation       | In progress | PostgreSQL bcrypt login, hashed sessions, lockout, first-login password reset, role journeys and tenant-negative checks pass; external identity, recovery and MFA remain pending                    |
| CPF-10 | Worker, integration, notification and webhook runtime         | In progress | leased outbox plus EventBridge publisher, event-id idempotency, bounded backoff, hashed errors and dead-letter behavior have unit/schema evidence                                                   |
| CPF-11 | Governed AI/tool gateway and evidence ledger                  | In progress | disabled-by-default, scope/purpose/version/budget/timeout/output guards and hash-only ledger records have unit evidence                                                                             |
| CPF-12 | Desktop companion and governed telemetry                      | In progress | signed-build/version/disclosure/attempt gates and event-first telemetry allow-list have unit evidence; packaged client absent                                                                       |
| CPF-13 | Deterministic PostgreSQL UAT seed                             | Complete    | idempotent seed creates 30 organizations, 120 campaigns, 360 applications and reset-required role credentials; changed passwords survive reseed                                                     |
| CPF-14 | Security, privacy, accessibility and resilience closure       | Not started | release-gate suite, evidence references and independent findings resolved                                                                                                                           |
| CPF-15 | Deployment/IaC/operations and controlled-pilot package        | In progress | semantically linted AWS CloudFormation, immutable container/deploy workflow, migration/live gates, monitoring and runbooks are authored; AWS apply and operational drills remain external           |

## Current deterministic demo scenario

All visible identities and records are synthetic. The web scenario now includes:

- Northstar Logistics tenant and distinct candidate, reviewer, employer, admin, support and governance workspaces.
- Candidate attempt `att_frontend_demo` with five tasks across saved, in-progress and not-started states.
- Server-issued deadline, autosave state, response version and display-safe checksum projection.
- Reviewer assignment `asg_frontend_demo`, three source evidence objects and five rubric criteria.
- A pre-saved human score, source citation, concealed AI observations, open integrity signal, training and availability states.
- Employer campaigns, candidates, invitations, scheduling, accommodations, review allocation, decisions and reports.
- Five tenant-local candidate/application records and four invitations spanning active, invited, accepted, completed, reviewed, withdrawn and expired states.
- An EMP-10 four-step import fixture with four fabricated emails, encrypted staging, row-level correction/exclusion and idempotent commit.
- An EMP-20/21 reviewed application plus a separate synthetic approver identity for drafting, approving, returning and issuing human decisions.
- Platform tenants, releases, jobs, flags, support access, governance registers, risks, incidents and evidence collections.

The canonical RUN-02 candidate flow, REV-08 human criterion scorecard and employer campaign list/detail/lifecycle now read and write through the explicit demo API into PostgreSQL. Candidate-detail reads and the contract-defined invitation create/resend/extend/revoke commands are also concrete, session-protected PostgreSQL operations. EMP-10 now executes the complete contract-defined candidate-import state machine: upload, preview, row listing, correction/exclusion, commit and cancel. EMP-20/21 add the three contract-defined decision operations for human drafting, distinct-person approval or return, and versioned issue. Decision persistence covers `review.progression_decisions`, `hiring.decision_approvals` and `integration.outbound_messages`, rejects self-approval, writes immutable audit/outbox evidence and keeps external notice references hashed. Import values are AES-GCM encrypted at rest in staging; candidate records use hashed external references; raw emails never enter audit or outbox payloads. The repositories apply tenant context, write audit records and enqueue transactional outbox events atomically. The server resolves bcrypt-backed, hashed and expiring candidate/reviewer/admin/approver sessions from IAM tables and checks resource scope before domain authorization. The wider UAT seed adds 30 organizations, 120 campaigns and 360 applications with reset-required role credentials. Live probes prove wrong credentials return 401, valid role journeys return 2xx, and cross-role access returns 403. Browser verification proves responses, flags, rubric scores, rationales and campaign transitions rehydrate from PostgreSQL with `ai_observation_id` remaining null; EMP-20/21 also pass wireframe comparison and interaction checks.

The employer candidate-directory and invitation list still have a formal contract/read-model gap because the supplied OpenAPI baseline has no tenant candidate-list or invitation-read operation. That gap remains visible behind an explicit fail-closed boundary rather than an invented public endpoint. No route or page under `apps/web/app` imports the obsolete synthetic or persistence stores, but API/schema combinations and route-specific persisted journey evidence remain incomplete. CPF-06 and CPF-13 therefore remain active release blockers rather than completed programme stages.

## Release blockers

1. All 244 baseline IDs are classified by the concrete dispatcher and the previously omitted merge-preview ID is fixed, but several grouped operations still use compatibility projections and require operation-specific contract/integration tests before CPF-07 can close.
2. No web route/page imports the obsolete stores, but several read models and lifecycle commands remain explicit 501 contract gaps and still require approved API deltas plus persisted browser evidence.
3. Session, role and resource-scope enforcement is proven for those slices, including the distinct EMP-21 approver; MFA and the remaining API/browser journeys still need end-to-end enforcement.
4. The worker, AI gateway and companion policy foundations now exist, but production transports/providers, PostgreSQL AI ledger binding, webhook replay evidence and a signed desktop binary remain incomplete.
5. Traceability rows still require executable evidence for every Must requirement.
6. Independent security, accessibility, human-factors, privacy/legal and controlled-pilot approvals are outside the current evidence set.

## Completion rule

The product is not production-ready until CPF-01 through CPF-15 are complete, `pnpm verify` and the production build pass, the OpenAPI/schema/route/requirement coverage reports have no unexplained gaps, and the legal/compliance release approvals named in the handover are recorded against the exact build.
