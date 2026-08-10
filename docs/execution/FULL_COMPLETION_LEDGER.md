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

| Stage  | Scope                                                         | Status      | Exit evidence                                                                                       |
| ------ | ------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| CPF-01 | Source reconciliation and canonical route inventory           | Complete    | 125/125 canonical routes asserted from the live handoff CSV                                         |
| CPF-02 | Shared shell, tokens and canonical account/auth routes        | Complete    | typecheck, build, browser QA and `design-qa.md`                                                     |
| CPF-03 | Candidate runtime RUN-02 vertical slice                       | Complete    | five realistic tasks; timer, save, version/checksum, flag and next-task interaction                 |
| CPF-04 | Reviewer scorecard REV-08 vertical slice                      | Complete    | evidence-led human scoring, citation, insufficient-evidence rationale and concealed AI observations |
| CPF-05 | Remaining interface fidelity and interaction closure          | In progress | all 125 routes require route-specific ready/empty/error/denied and primary interaction evidence     |
| CPF-06 | Replace web process-local stores with authenticated API calls | Not started | all web mutations survive process restart and are tenant-scoped                                     |
| CPF-07 | Wire 244 OpenAPI operations to concrete handlers              | Not started | no generic catch-all response; contract conformance suite passes                                    |
| CPF-08 | PostgreSQL repositories and transaction/outbox coverage       | In progress | current repositories cover a subset; all material writes require atomic audit/outbox                |
| CPF-09 | Identity, sessions, MFA, RBAC/ABAC and tenant isolation       | In progress | negative auth, IDOR, stale-token, cross-tenant and privilege tests pass                             |
| CPF-10 | Worker, integration, notification and webhook runtime         | Not started | retry/idempotency/dead-letter/replay protection evidence                                            |
| CPF-11 | Governed AI/tool gateway and evidence ledger                  | Not started | disabled-by-default gateway, provenance, budget, safety, version and outage gates                   |
| CPF-12 | Desktop companion and governed telemetry                      | Not started | signed/version-gated client, allow-list, recovery and privacy evidence                              |
| CPF-13 | Deterministic PostgreSQL demo seed                            | Not started | one command creates all demo roles and key lifecycle states without real PII                        |
| CPF-14 | Security, privacy, accessibility and resilience closure       | Not started | release-gate suite, evidence references and independent findings resolved                           |
| CPF-15 | Deployment/IaC/operations and controlled-pilot package        | Not started | reproducible deployment, backup/restore, rollback, monitoring and runbooks                          |

## Current deterministic demo scenario

All visible identities and records are synthetic. The web scenario now includes:

- Northstar Logistics tenant and distinct candidate, reviewer, employer, admin, support and governance workspaces.
- Candidate attempt `att_frontend_demo` with five tasks across saved, in-progress and not-started states.
- Server-issued deadline, autosave state, response version and display-safe checksum projection.
- Reviewer assignment `asg_frontend_demo`, three source evidence objects and five rubric criteria.
- A pre-saved human score, source citation, concealed AI observations, open integrity signal, training and availability states.
- Employer campaigns, candidates, invitations, scheduling, accommodations, review allocation, decisions and reports.
- Platform tenants, releases, jobs, flags, support access, governance registers, risks, incidents and evidence collections.

This process-local scenario is suitable for product demonstration only. CPF-06 and CPF-13 remain release blockers until the same lifecycle is persisted through the authenticated API and PostgreSQL seed.

## Release blockers

1. The generic server dispatcher still returns in-memory responses instead of invoking every concrete `apps/api` handler.
2. The web application still reads and mutates process-local synthetic stores.
3. Authentication/session, tenant context and resource ABAC are not enforced end-to-end in the browser journey.
4. Worker/outbox publishing, integrations, governed AI/tool adapters and desktop companion are incomplete.
5. Traceability rows still require executable evidence for every Must requirement.
6. Independent security, accessibility, human-factors, privacy/legal and controlled-pilot approvals are outside the current evidence set.

## Completion rule

The product is not production-ready until CPF-01 through CPF-15 are complete, `pnpm verify` and the production build pass, the OpenAPI/schema/route/requirement coverage reports have no unexplained gaps, and the legal/compliance release approvals named in the handover are recorded against the exact build.
