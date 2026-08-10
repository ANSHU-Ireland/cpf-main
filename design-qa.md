# Design QA — shared UI contract and production journey repair

Date: 2026-08-10

## Comparison target

Source visual truth:

- `cpf-penpot-handoff/interfaces/auth-04.svg`
- `cpf-penpot-handoff/interfaces/acc-04.svg`
- `cpf-penpot-handoff/interfaces/acc-05.svg`
- `cpf-penpot-handoff/interfaces/ds-01.svg`
- `cpf-penpot-handoff/interfaces/run-02.svg`
- `cpf-penpot-handoff/interfaces/rev-08.svg`

Browser-rendered implementation evidence:

- `docs/execution/evidence/screenshots/auth-04-implementation.png`
- `docs/execution/evidence/screenshots/acc-04-implementation.png`
- `docs/execution/evidence/screenshots/acc-05-implementation.png`
- `docs/execution/evidence/screenshots/ds-01-implementation.png`
- `docs/execution/evidence/screenshots/run-02-implementation.png`
- `docs/execution/evidence/screenshots/rev-08-implementation.png`

Normalized source captures:

- `docs/execution/evidence/screenshots/auth-04-source.png`
- `docs/execution/evidence/screenshots/acc-04-source.png`
- `docs/execution/evidence/screenshots/acc-05-source.png`
- `docs/execution/evidence/screenshots/ds-01-source.png`
- `docs/execution/evidence/screenshots/run-02-source.png`
- `docs/execution/evidence/screenshots/rev-08-source.png`

## Capture normalization

- Source SVG canvas: 1440 × 1024 pixels.
- Source and implementation browser captures: 1280 × 720 pixels.
- CSS viewport: 1280 × 720.
- Device scale factor: 1.
- State: initial ready state, light theme, desktop layout.
- The source SVG's developer-handoff metadata column is specification annotation, not product UI, and is excluded from runtime fidelity findings.
- The persistent synthetic-environment banner is an established CPF safety constraint and is retained intentionally.
- RUN-02 and REV-08 were additionally compared at the handoff desktop target. Their 330 px developer annotation rail is handoff-only and is not rendered in product UI.

## Findings

No actionable P0, P1 or P2 differences remain.

The implementation preserves the source hierarchy, CPF navigation/main-content split, warm neutral canvas, white bordered surfaces, blue primary actions, state language and requirement-specific page titles. Generic handoff placeholder fields were replaced with the actual functional controls named by each requirement rather than reproduced as inert fields.

### Required fidelity surfaces

- Fonts and typography: passed. The browser reports `"Public Sans", "Source Sans 3", Arial, sans-serif`; multi-word families are now quoted correctly. Heading hierarchy, line height and wrapping remain legible at the comparison viewport.
- Spacing and layout rhythm: passed. Main regions, card padding, step progression and form rhythm match the handoff proportions. The design-system state surface was expanded after the first comparison to restore the intended vertical composition.
- Colors and visual tokens: passed. Paper, navigation, soft background, line, blue, sage, amber and red states resolve from the verified CPF token package.
- Image and icon fidelity: passed. The warning mark uses the Phosphor icon library with the handoff amber token; no CSS drawing, text glyph, inline SVG or placeholder asset is used.
- Copy and content: passed. Titles and intent match AUTH-04, ACC-04, ACC-05 and DS-01. Requirement-specific controls intentionally replace the handoff's generic field labels.

## Full-view comparison evidence

- AUTH-04: matching title, account shell, card/form treatment and blue verification action; the implemented signed-challenge flow is functional.
- ACC-04: matching four-step wizard structure, active-step treatment and primary continuation action; all four steps are functional.
- ACC-05: matching record summary and export action; export lifecycle and guarded deactivation are functional.
- DS-01: matching overview navigation, title, action placement, tall state surface, amber warning mark and state matrix.
- RUN-02: matching 196 px assessment navigation, title/route/badges, dark runtime header, server timer, two-pane task workspace, five-step navigator, selected task, save checksum and bottom actions.
- REV-08: matching reviewer navigation, title/route/badges, evidence/judgement split, source-linked evidence, Criterion 1 of 5, selected human rubric level, evidence citation, concealed AI observations and bottom save flow.

Focused region captures were not required: at 1280 × 720 the primary headings, labels, controls, state text and icon treatment are legible in the full-view pairs. Interaction state was verified separately through semantic browser controls.

## Comparison history

1. Initial font check found a P1 fallback to Times New Roman because multi-word font names were emitted without quotes. `app/theme.ts` now quotes each multi-word family; the post-fix browser-computed family is Public Sans first.
2. First DS-01 comparison found a P2 composition mismatch: the state card was compressed and component samples appeared above the fold. The card now restores the tall reference composition, state matrix and top/bottom component-spec actions.
3. The revised DS-01 comparison found the warning asset missing. A reusable Phosphor warning icon was added using CPF amber tokens, and the final browser capture shows the icon with no console errors.
4. Final comparison found no remaining actionable P0/P1/P2 differences.
5. RUN-02 initially inherited the generic candidate shell and a second runtime toolbar. The role shell now follows the handoff's 196 px navigation and the overview renders as the task-led workspace.
6. REV-08 initially rendered generic stacked score cards without linked source evidence. The route now composes evidence, human rubric choice, source citation, insufficient-evidence rationale and the independent-review AI gate.
7. A fresh-browser pass after the shared-shell update reported no console errors on either production journey.

## Interaction and browser checks

- Email: requested a challenge, entered a six-character code, and reached “Email verified and updated.”
- Onboarding: completed all three required tasks, advanced through four steps, and reached the recorded completion state.
- Privacy: requested an export through its queued/processing/complete states, entered the explicit deactivation confirmation and reached the recorded state.
- Design system: component-spec links resolve to the component catalogue anchor.
- Browser console: no errors on the verified routes.
- Horizontal overflow: none in the implementation viewport.
- Candidate runtime: edited and saved Task 2, received version 4 plus a verified checksum, flagged the task and advanced to Task 3.
- Reviewer workspace: saved a human rubric level, advanced to Criterion 2, selected insufficient evidence, entered its required rationale and received the autosave acknowledgement.

## Follow-up polish

- P3: the established CPF runtime header is intentionally simpler than the developer-handoff chrome (no date, tenant footer or annotation panel).

final result: passed
