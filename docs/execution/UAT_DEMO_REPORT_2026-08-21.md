# CPF functional-demo UAT report — 21 August 2026

## Outcome

**PASS for the local synthetic functional demo.** The web application builds 98 routes, all seven
role workspaces open, and the primary task journeys below complete with fabricated records.

This is not a production-readiness approval. The production API remains fail-closed where an
approved contract is missing, and external identity, legal, signing, provider and deployment gates
still require evidence from their authorised owners.

## UAT environment

- Web application: `http://127.0.0.1:4300`
- Platform API: `http://127.0.0.1:3000`
- Data mode: `CPF_DEMO_MODE=true`; all identities and records are synthetic
- Visual source: `cpf-penpot-handoff` Option 2 tokens and interface SVGs
- Browser sizes checked: 320 × 900, 768 × 1024 and 1440 × 1024

## Journeys exercised

| Role           | Journey                                                                    | Result |
| -------------- | -------------------------------------------------------------------------- | ------ |
| Candidate      | Sign in → applications → readiness → start assessment → edit and save task | PASS   |
| Reviewer       | Sign in → queue → assignment → evidence → scorecard → save criterion       | PASS   |
| Employer       | Sign in → dashboard → candidate directory → add synthetic candidate        | PASS   |
| Platform admin | Sign in → command centre → tenant directory → provision synthetic tenant   | PASS   |
| Governance     | Sign in → overview → risk register → add controlled synthetic risk         | PASS   |
| Operations     | Sign in → dashboard → acknowledge priority alert                           | PASS   |
| Support        | Sign in → queue → case detail → update status → send reply                 | PASS   |

## Automated checks

- Workspace type checking passed across all 16 participating projects.
- The optimized Next.js production build generated all 98 pages successfully.
- ESLint passed on every changed TypeScript and JavaScript file.
- Five safety-boundary tests passed, including proof that demo projections are enabled only in
  demo mode while production keeps the documented `501 application/problem+json` boundary.
- The expanded functional smoke suite passed 32 authenticated reads and safe synthetic actions
  across all seven roles.

## Defects found and resolved during UAT

1. The project used Tailwind utility classes without a Tailwind/PostCSS compiler, causing the
   visibly unstyled interface. The compiler and Penpot-aligned token mapping are now active.
2. `/governance` returned 404. It now opens a task-first governance overview backed by real demo
   read models.
3. Support case detail returned a contract-gap error. The demo now provides case detail, message
   history, visible status changes and replies while production remains fail-closed.
4. Candidate assessment start returned 404 for the already-started demo attempt. Demo launch is
   now idempotent and opens the full assessment runtime.
5. The mobile shell exposed the entire navigation before the page and overflowed at 320 px. It now
   uses an accessible 44 px menu control, closes after navigation and has no forced horizontal
   overflow.
6. Candidate home and application records hid the primary assessment action. Both now expose a
   direct, Penpot-aligned Continue assessment path.

## Accessibility and usability evidence

- Semantic banners, main landmarks, labelled navigation, page headings and status messages were
  present in the inspected DOM.
- Primary mobile controls meet the 44 px target and the mobile navigation exposes correct
  `aria-expanded` states.
- Statuses pair text with colour; no audited task depended on colour alone.
- New-user workspace selection explains each role before sign-in.
- Governance uses a task-first overview to reduce the cost of its full compliance navigation.

This pass is an implementation UAT, not an independent WCAG certification or assistive-technology
conformance audit.

## Evidence

Screenshots are stored in `artifacts/uat-audit`. The numbered sequence includes the original broken
state, the Penpot source comparison, repaired role screens, responsive states and completed task
flows. See `artifacts/uat-audit/README.md` for the evidence index.

## Production release gates still requiring authorised evidence

- Approval of the documented public API deltas for EMP-11, EMP-15, GOV-09 and OPS-02.
- Real identity and MFA provider configuration and security evidence.
- AI provider credentials, evaluations and governance evidence.
- Signed desktop-companion build and distribution controls.
- Legal/DPO approvals, retention decisions and policy sign-off.
- Deployment/IaC, observability, backup/restore and operational acceptance evidence.

None of those external gates is simulated or marked complete by this report.
