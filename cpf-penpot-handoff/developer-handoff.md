# CPF Penpot developer handoff

Version 2.0 · Option 2 guided-review direction · 4 August 2026

## Release-critical product invariants

1. AI output is always labelled and source-linked.
2. AI never creates or displays a numeric candidate score, rank, performance band, integrity verdict, progression recommendation or hiring decision.
3. A human reviewer creates rubric scores from evidence. Any aggregate is deterministic from human-entered rubric values only.
4. An authorised employer human creates, and where policy requires separately approves, the progression decision. Decision forms start empty.
5. Attempts use server-authoritative time, idempotent commands, checksum-aware autosave and immutable submission receipts.
6. Consequential edits create superseding versions; historical decisions and reviews are never silently mutated.
7. Tenant isolation and least privilege apply in the service and database layers; JIT support access is time-bound, approved and visible.

## Penpot import

Import the SVG files in `boards/` for journey boards, or the files in `interfaces/` for one screen per page. SVG groups, text, fills and borders remain editable. Set Public Sans or Source Sans 3 as the project font if Penpot substitutes Arial.

## Global interaction contract

Every applicable interface includes loading, ready, empty, filtered-empty, draft, validation-error, permission-denied, conflict, expired, offline, queued, partial-success, failed, cancelled and complete states. Destructive, bulk, privilege, submission and issuance actions require a clear consequence statement and confirmation. Focus returns to a logical trigger after transient UI closes; focus is never lost.

## Responsive contract

- 1440 desktop: fixed 196 px role navigation, flexible content, 330 px developer annotation rail in handoff only.
- 1024 compact desktop/tablet: collapsible navigation, no persistent annotation rail in product UI, two-pane workspaces maintain a minimum evidence width.
- 768 tablet: panes stack where task safety permits; assessment authoring and reviewer scoring should warn when width is insufficient.
- 320 mobile: candidate account, scheduling, notices, status, rights and support reflow to one column. Timed document/code/spreadsheet runtime requires the governed desktop experience.

## API and source totals

- 244 operations across the OpenAPI baseline.
- 362 product and non-functional requirements.
- 139 SQL tables parsed from the PostgreSQL baseline.
- Every row is mapped in `coverage/`; totals are mechanically validated during generation.

## Interface catalogue

### Shared account

| ID      | Interface                     | Actor        | Route                    | Endpoints | Requirements |
| ------- | ----------------------------- | ------------ | ------------------------ | --------: | -----------: |
| AUTH-01 | Sign in                       | All users    | `/auth/login`            |         2 |            9 |
| AUTH-02 | Invitation activation         | Invited user | `/activate`              |         3 |            2 |
| AUTH-03 | Password recovery             | All users    | `/auth/recover`          |         2 |            1 |
| AUTH-04 | Email verification and change | All users    | `/account/email`         |         4 |            3 |
| AUTH-05 | MFA challenge and methods     | All users    | `/auth/mfa`              |         5 |            3 |
| ACC-01  | Profile and preferences       | All users    | `/account/profile`       |         4 |            7 |
| ACC-02  | Notification preferences      | All users    | `/account/notifications` |         2 |            1 |
| ACC-03  | Security and sessions         | All users    | `/account/security`      |         5 |           10 |
| ACC-04  | Notices and onboarding        | All users    | `/account/onboarding`    |         3 |            2 |
| ACC-05  | Data export and deactivation  | All users    | `/account/privacy`       |         2 |            2 |
| ACC-06  | My support cases              | All users    | `/account/support`       |         4 |            3 |

### Candidate

| ID     | Interface                         | Actor     | Route                             | Endpoints | Requirements |
| ------ | --------------------------------- | --------- | --------------------------------- | --------: | -----------: |
| CAN-01 | Candidate home                    | Candidate | `/candidate`                      |         0 |            6 |
| CAN-02 | Candidate profile and corrections | Candidate | `/candidate/profile`              |         2 |            1 |
| CAN-03 | Candidate notices                 | Candidate | `/candidate/notices`              |         2 |            3 |
| CAN-04 | Accommodation request             | Candidate | `/candidate/accommodations`       |         3 |            1 |
| CAN-05 | Scheduling and booking            | Candidate | `/candidate/schedule`             |         3 |            2 |
| CAN-06 | Practice centre                   | Candidate | `/candidate/practice`             |         1 |            1 |
| CAN-07 | System pre-check                  | Candidate | `/candidate/precheck`             |         2 |            3 |
| CAN-08 | Application status                | Candidate | `/candidate/application`          |         1 |            9 |
| CAN-09 | Withdraw application              | Candidate | `/candidate/application/withdraw` |         1 |            1 |
| CAN-10 | Explanation and human review      | Candidate | `/candidate/review-request`       |         2 |            3 |
| CAN-11 | Data rights centre                | Candidate | `/candidate/data-rights`          |         2 |           13 |
| CAN-12 | Complaint centre                  | Candidate | `/candidate/complaints`           |         1 |            1 |
| CAN-13 | Candidate support                 | Candidate | `/candidate/support`              |         0 |            7 |

### Assessment runtime

| ID     | Interface                 | Actor     | Route                                  | Endpoints | Requirements |
| ------ | ------------------------- | --------- | -------------------------------------- | --------: | -----------: |
| RUN-01 | Assessment readiness      | Candidate | `/candidate/assessment/readiness`      |         1 |            2 |
| RUN-02 | Assessment overview       | Candidate | `/candidate/attempt/:id`               |         1 |            2 |
| RUN-03 | Document task             | Candidate | `/candidate/attempt/:id/task/document` |         1 |            2 |
| RUN-04 | Code task                 | Candidate | `/candidate/attempt/:id/task/code`     |         0 |            0 |
| RUN-05 | Spreadsheet task          | Candidate | `/candidate/attempt/:id/task/sheet`    |         0 |            0 |
| RUN-06 | AI collaboration panel    | Candidate | `/candidate/attempt/:id/ai`            |         2 |           11 |
| RUN-07 | Plugin execution          | Candidate | `/candidate/attempt/:id/plugin`        |         1 |            2 |
| RUN-08 | Artifacts and uploads     | Candidate | `/candidate/attempt/:id/artifacts`     |         2 |            1 |
| RUN-09 | Flags and break           | Candidate | `/candidate/attempt/:id/controls`      |         2 |            2 |
| RUN-10 | Incident and recovery     | Candidate | `/candidate/attempt/:id/recovery`      |         1 |            2 |
| RUN-11 | Submission preview        | Candidate | `/candidate/attempt/:id/submit`        |         1 |            1 |
| RUN-12 | Submitting and receipt    | Candidate | `/candidate/attempt/:id/receipt`       |         1 |            2 |
| RUN-13 | Expired or voided attempt | Candidate | `/candidate/attempt/:id/unavailable`   |         0 |            0 |

### Reviewer

| ID     | Interface                    | Actor             | Route                                  | Endpoints | Requirements |
| ------ | ---------------------------- | ----------------- | -------------------------------------- | --------: | -----------: |
| REV-01 | Reviewer home and queue      | Employer Reviewer | `/review`                              |         1 |            5 |
| REV-02 | Reviewer profile             | Employer Reviewer | `/review/profile`                      |         2 |            1 |
| REV-03 | Availability                 | Employer Reviewer | `/review/availability`                 |         2 |            1 |
| REV-04 | Training and eligibility     | Employer Reviewer | `/review/training`                     |         1 |            2 |
| REV-05 | Assignment detail            | Employer Reviewer | `/review/assignment/:id`               |         1 |            2 |
| REV-06 | Accept, decline or conflict  | Employer Reviewer | `/review/assignment/:id/respond`       |         3 |            2 |
| REV-07 | Evidence review workspace    | Employer Reviewer | `/review/assignment/:id/evidence`      |         1 |            7 |
| REV-08 | Criterion scorecard          | Employer Reviewer | `/review/assignment/:id/scorecard`     |         2 |           11 |
| REV-09 | AI observations reveal       | Employer Reviewer | `/review/assignment/:id/observations`  |         3 |           10 |
| REV-10 | Integrity review             | Employer Reviewer | `/review/assignment/:id/integrity`     |         1 |           13 |
| REV-11 | Clarification and escalation | Employer Reviewer | `/review/assignment/:id/clarification` |         1 |            1 |
| REV-12 | Submit review                | Employer Reviewer | `/review/assignment/:id/submit`        |         1 |            2 |
| REV-13 | Review receipt               | Employer Reviewer | `/review/assignment/:id/receipt`       |         0 |            0 |
| REV-14 | Review amendment             | Employer Reviewer | `/review/assignment/:id/amend`         |         1 |            1 |

### Employer admin

| ID     | Interface                   | Actor                   | Route                                 | Endpoints | Requirements |
| ------ | --------------------------- | ----------------------- | ------------------------------------- | --------: | -----------: |
| EMP-01 | Employer dashboard          | Employer Admin          | `/employer`                           |         3 |            5 |
| EMP-02 | Organisation profile        | Employer Admin          | `/employer/organization`              |         2 |            4 |
| EMP-03 | Members and invitations     | Employer Admin          | `/employer/members`                   |         3 |            1 |
| EMP-04 | Departments and teams       | Employer Admin          | `/employer/structure`                 |         6 |            1 |
| EMP-05 | Campaign list               | Employer Admin          | `/employer/campaigns`                 |         2 |            3 |
| EMP-06 | Campaign setup wizard       | Employer Admin          | `/employer/campaigns/new`             |         4 |            6 |
| EMP-07 | Campaign preflight          | Employer Admin          | `/employer/campaigns/:id/preflight`   |         1 |            2 |
| EMP-08 | Campaign lifecycle          | Employer Admin          | `/employer/campaigns/:id`             |         4 |            3 |
| EMP-09 | Campaign operations         | Employer Admin          | `/employer/campaigns/:id/dashboard`   |         1 |            2 |
| EMP-10 | Candidate import            | Employer Admin          | `/employer/candidates/import`         |         6 |            3 |
| EMP-11 | Candidate directory         | Employer Admin          | `/employer/candidates`                |         0 |            3 |
| EMP-12 | Candidate record            | Employer Admin          | `/employer/candidates/:id`            |         3 |            3 |
| EMP-13 | Duplicate merge             | Employer Admin          | `/employer/candidates/:id/merge`      |         1 |            1 |
| EMP-14 | Invitation management       | Employer Admin          | `/employer/invitations`               |         4 |            3 |
| EMP-15 | Scheduling operations       | Employer Admin          | `/employer/scheduling`                |         0 |            0 |
| EMP-16 | Accommodation decision      | Employer Admin          | `/employer/accommodations`            |         2 |            3 |
| EMP-17 | Reviewer administration     | Employer Admin          | `/employer/reviewers`                 |         2 |            1 |
| EMP-18 | Assignment board            | Employer Admin          | `/employer/assignments`               |         1 |            1 |
| EMP-19 | Candidate comparison        | Employer Admin          | `/employer/campaigns/:id/comparison`  |         1 |           10 |
| EMP-20 | Decision draft              | Employer Decision Maker | `/employer/applications/:id/decision` |         1 |            2 |
| EMP-21 | Decision approval and issue | Employer Approver       | `/employer/applications/:id/approval` |         2 |            2 |
| EMP-22 | Reports and exports         | Employer Admin          | `/employer/reports`                   |         2 |           10 |
| EMP-23 | Integrations and webhooks   | Employer Admin          | `/employer/integrations`              |         7 |            1 |
| EMP-24 | Communication templates     | Employer Admin          | `/employer/templates`                 |         5 |            9 |
| EMP-25 | Deployment readiness        | Employer Admin          | `/employer/readiness`                 |         2 |            2 |

### Platform admin

| ID     | Interface                | Actor           | Route                             | Endpoints | Requirements |
| ------ | ------------------------ | --------------- | --------------------------------- | --------: | -----------: |
| ADM-01 | Platform command centre  | CPF Super Admin | `/admin`                          |         0 |            4 |
| ADM-02 | Tenant directory         | CPF Super Admin | `/admin/tenants`                  |         2 |            6 |
| ADM-03 | Tenant detail and status | CPF Super Admin | `/admin/tenants/:id`              |         2 |            1 |
| ADM-04 | Tenant staff and roles   | CPF Super Admin | `/admin/tenants/:id/staff`        |         8 |            9 |
| ADM-05 | Plans and subscription   | CPF Super Admin | `/admin/tenants/:id/subscription` |         4 |            2 |
| ADM-06 | Feature flags            | CPF Super Admin | `/admin/feature-flags`            |         3 |            1 |
| ADM-07 | Background jobs          | CPF Super Admin | `/admin/jobs`                     |         3 |            2 |
| ADM-08 | Platform audit           | CPF Super Admin | `/admin/audit`                    |         2 |            3 |
| ADM-09 | Maintenance and releases | CPF Super Admin | `/admin/releases`                 |         3 |            2 |
| ADM-10 | Support oversight        | CPF Super Admin | `/admin/support`                  |         0 |            0 |
| ADM-11 | Privileged access grant  | CPF Super Admin | `/admin/privileged-access`        |         2 |            2 |

### Assessment governance

| ID     | Interface                    | Actor            | Route                               | Endpoints | Requirements |
| ------ | ---------------------------- | ---------------- | ----------------------------------- | --------: | -----------: |
| AST-01 | Assessment catalogue         | Assessment Admin | `/admin/assessments`                |         2 |            7 |
| AST-02 | Assessment version builder   | Assessment Admin | `/admin/assessments/:id/version`    |         1 |            2 |
| AST-03 | Assessment preview           | Assessment Admin | `/admin/assessments/:id/preview`    |         2 |            1 |
| AST-04 | Assessment validation        | Assessment Admin | `/admin/assessments/:id/validation` |         1 |            2 |
| AST-05 | Assessment lifecycle         | Assessment Admin | `/admin/assessments/:id`            |         3 |            5 |
| AST-06 | Assessment defects           | Assessment Admin | `/admin/assessments/:id/defects`    |         1 |            1 |
| AI-01  | AI system and model registry | AI Governance    | `/admin/ai-models`                  |         2 |            9 |
| AI-02  | AI evaluation                | AI Governance    | `/admin/ai-models/:id/evaluation`   |         1 |            2 |
| AI-03  | AI model lifecycle           | AI Governance    | `/admin/ai-models/:id`              |         2 |            3 |
| AI-04  | Prompt versions              | AI Governance    | `/admin/prompts`                    |         3 |            3 |
| PLG-01 | Plugin governance            | Plugin Admin     | `/admin/plugins`                    |         3 |            4 |

### Governance

| ID     | Interface                        | Actor                      | Route                               | Endpoints | Requirements |
| ------ | -------------------------------- | -------------------------- | ----------------------------------- | --------: | -----------: |
| GOV-01 | AI system inventory              | AI Governance              | `/governance/ai-systems`            |         2 |            9 |
| GOV-02 | AI Act classification            | AI Governance              | `/governance/classifications`       |         1 |            2 |
| GOV-03 | Risk and control register        | Risk Owner                 | `/governance/risks`                 |         2 |            1 |
| GOV-04 | Dataset governance               | Data Steward               | `/governance/datasets`              |         2 |            1 |
| GOV-05 | Technical documentation          | Compliance                 | `/governance/technical-docs`        |         2 |            1 |
| GOV-06 | Quality management system        | Compliance                 | `/governance/qms`                   |         2 |            1 |
| GOV-07 | Data-use register                | DPO / Data Steward         | `/governance/data-use`              |         2 |           12 |
| GOV-08 | Impact assessments               | DPO / Compliance           | `/governance/impact-assessments`    |         2 |            2 |
| GOV-09 | Human oversight plan             | AI Governance              | `/governance/oversight`             |         0 |            0 |
| GOV-10 | Deployer instructions            | Compliance                 | `/governance/deployer-instructions` |         2 |            1 |
| GOV-11 | AI literacy                      | Training Admin             | `/governance/ai-literacy`           |         2 |            1 |
| GOV-12 | Conformity assessment            | Compliance                 | `/governance/conformity`            |         2 |            2 |
| GOV-13 | Declaration, registration and CE | Compliance                 | `/governance/market-access`         |         3 |            3 |
| GOV-14 | Post-market monitoring plan      | Compliance                 | `/governance/post-market`           |         2 |            1 |
| GOV-15 | Signals and drift                | Operations / AI Governance | `/governance/signals`               |         2 |            1 |
| GOV-16 | Serious incident workflow        | Incident Manager           | `/governance/incidents`             |         2 |            2 |
| GOV-17 | Vendor evidence                  | Vendor Manager             | `/governance/vendors`               |         2 |            1 |
| GOV-18 | Change control                   | Change Authority           | `/governance/changes`               |         2 |            2 |
| AUD-01 | Evidence collections             | Auditor / Compliance       | `/audit/evidence`                   |         2 |            5 |
| AUD-02 | Requirement traceability         | Auditor / Compliance       | `/audit/traceability`               |         1 |            1 |

### Support

| ID     | Interface                         | Actor              | Route                    | Endpoints | Requirements |
| ------ | --------------------------------- | ------------------ | ------------------------ | --------: | -----------: |
| SUP-01 | Support queue                     | Support Agent      | `/support`               |         1 |            9 |
| SUP-02 | Support case workspace            | Support Agent      | `/support/cases/:id`     |         2 |            2 |
| SUP-03 | JIT access session                | Support Agent      | `/support/access`        |         0 |            0 |
| OPS-01 | Operations dashboard              | Operations         | `/operations`            |         0 |            9 |
| OPS-02 | Security incident and kill switch | Incident Commander | `/operations/incident`   |         0 |           18 |
| OPS-03 | Integration delivery monitor      | Operations         | `/operations/deliveries` |         0 |            0 |

### Design system

| ID    | Interface                               | Actor     | Route            | Endpoints | Requirements |
| ----- | --------------------------------------- | --------- | ---------------- | --------: | -----------: |
| DS-01 | Design system, states and accessibility | All users | `/design-system` |         0 |           67 |

## Implementation notes

- Use the OpenAPI `x-required-roles`, `x-requirement-ids`, `x-human-decision-required` and `x-audit-event` extensions as executable policy metadata, not display-only documentation.
- Use optimistic concurrency tokens on scorecards, decisions, mutable configuration and administrative records. On conflict, preserve both the server version and the user's unsaved input and offer compare/reapply.
- Keep asynchronous jobs visible with queued/running/partial/failed/cancelled/complete states and idempotent retry.
- Render status with text and shape in addition to colour. Never put critical information in hover-only UI.
- Avoid embedding sensitive or special-category information in logs, analytics labels, URLs or notification copy.
- Evidence links resolve to immutable versions and preserve the reviewer’s cited fragment and context.

## Verification gates

- Endpoint coverage count equals the OpenAPI operation count.
- Requirement coverage has no uncovered row.
- Schema coverage has no uncovered parsed SQL table.
- Human-decision operations are mapped to a human-authority screen.
- Reviewer and employer decision screens contain the AI prohibition banner.
- 320 px reflow, 200% text zoom, keyboard-only operation and screen-reader names are verified before release.
