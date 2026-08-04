# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — `@cpf/ui` accessible primitives

**Goal:** build the first accessible React primitives (Button, Input, Field/label) themed from
`@cpf/tokens`, with WCAG-focused tests (labels, roles, focus-visible, 44px target). `@cpf/tokens`
(design tokens) is already done and parity-tested.

**Source identifiers:**

- `@cpf/tokens` (colors, radii, `control.minimumTargetPx = 44`).
- `cpf-penpot-handoff/developer-handoff.md` for component states/spacing.

**Steps:**

1. Add React + Testing Library + jsdom; enable jsdom env for `packages/ui` in vitest config.
2. `@cpf/ui`: Button + Input + Field primitives — associated labels, visible focus, min target.
3. Tests: render + a11y assertions (accessible name, role, disabled semantics).
4. Update ledgers; commit. Then wire the account/identity vertical to these primitives.

## Then (Wave 1 continuation)

- Account/identity vertical (sign-in, tenant selection) wired UI + API + policy + audit + tests.
- Layer each new endpoint over the validated policy/RLS defence-in-depth.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
