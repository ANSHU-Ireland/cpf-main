# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — design tokens → `@cpf/ui` primitives

**Goal:** turn the verified Penpot `design-tokens.json` into a typed, tree-shakeable token module,
and build the first accessible `@cpf/ui` primitives (Button, Input, Field/label) with WCAG-focused
unit tests — the foundation the account/identity vertical will render with.

**Source identifiers:**

- `cpf-penpot-handoff/design-tokens.json` (verified in SOURCE_MANIFEST).
- `cpf-penpot-handoff/developer-handoff.md` for component states/spacing.

**Steps:**

1. `@cpf/tokens`: parse/emit design tokens as typed const objects (colors, spacing, typography,
   radii). Snapshot/shape test asserting counts match the source file.
2. `@cpf/ui`: Button + Input + Field primitives, deny-by-default a11y (labels, roles, focus).
3. Tests: render + a11y assertions; wire the vertical to the account/identity screens next.
4. Update ledgers; commit.

## Then (Wave 1 continuation)

- Account/identity vertical (sign-in, tenant selection) wired UI + API + policy + audit + tests.
- Layer each new endpoint over the validated policy/RLS defence-in-depth.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
