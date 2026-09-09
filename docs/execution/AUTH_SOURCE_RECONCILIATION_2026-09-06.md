# AUTH-01 / ACC-03 source reconciliation — 6 September 2026

## Sources actually inspected

- `cpf-penpot-handoff/developer-handoff.md` and `design-tokens.json`.
- Original editable `interfaces/auth-01.svg` and `interfaces/acc-03.svg` (1440 × 1024).
- SQL baseline `iam.users`, `iam.user_sessions`, `iam.account_security_events`.
- Implemented password repository, isolated live password tests, sessions adapter and password adapter.

## Conflicts resolved in favour of functional, safe behaviour

AUTH-01 is a generic form: Display name, Scope/category, Effective date and Rationale. Its own
contract instead specifies password login and password change. Do not implement those generic
fields as authentication inputs. ACC-03 likewise contains generic records with Ready/Draft/Archived
and Restore actions; these are not valid session lifecycle operations. Sessions are owner-scoped,
expire and may be revoked; a revoked session must not gain an invented Restore action.

Keep the Penpot palette, typography stack, radii and role shell; use the real API fields and actual
actor/session data. The developer annotation rail is handoff-only and must not appear in the app.
Historical dates, example tenants and example actors are reference content, not runtime facts.
The README references `coverage/` exports, but that directory is absent from this checkout;
do not claim its endpoint/requirement/schema acceptance gates were verified.

## First implementation checkpoint

- Required password change now explains why the user is on Security, the session consequences,
  and the destination workspace when available.
- The approved navigation destination survives password change and the return to credential sign-in.
  It is an exact allowlist hint, not an authorization grant or arbitrary redirect URL.
- MFA and required password changes remain intact. No user's password is changed by this work.
- New-password completion explains that temporary demo credentials no longer work for that account.
- Security uses the ACC-03 title/description and links to existing real session management.
- Password submissions reject missing current credentials and duplicate pending requests.

Saved and pushed as `14ec8ac`. Formatting, focused lint and web typecheck passed. All 31 targeted
tests passed: 13 allowlist/continuation tests, 12 navigation/auth UI checks, four sign-in route
tests and two live password repository tests against `cpf_uat_verify`. No demo user's password
was changed. The live tests establish password rotation, clearing reset-required and revocation
of old sessions in the isolated test fixture, not completed browser onboarding for the owner.

The full auth visual comparison is still blocked in project-root `design-qa.md`. Diagnostic PNGs
in `artifacts/uat-audit/*-reference-sept06.png` preserve the inspected layouts but have an incorrect
serif font fallback from the local renderer; use original SVGs as visual authority.
This is not all-screen Penpot fidelity, complete UAT, or a production-ready release. Continue with
the real session list and confirmation behaviour from ACC-03, then the linked hiring journey.
Hosting stays deferred.
