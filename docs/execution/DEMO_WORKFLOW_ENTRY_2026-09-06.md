# Workflow entry checkpoint — 6 September 2026

The owner could not understand the demo workflow and was stranded in account preferences.
This checkpoint addresses navigation and orientation, not full product completion.

- Replaced the empty landing card with a six-step, role-linked hiring walkthrough.
- Added a direct link to the previously browser-verified, already-issued Northstar decision
  for DEMO-CANDIDATE-05 (application ending 217). This is an inspection example, not a reset task.
- Clearly distinguishes intended workflow from tested decision steps and unfinished areas.
- Added Approver and Auditor to sign-in. Walkthrough links select a known role and prefill
  its email without automatic sign-in or accepting arbitrary redirect destinations.
- Added an always-visible Demo guide link to the shared shell, including Account settings.
- Removed the shell's invented current date and hardcoded tenant. Account details remain linked.
- Only the most specific sidebar destination is active; exact links retain their semantics.
- MFA and required password-change redirects remain enforced by the existing sign-in flow.

The full campaign → candidate attempt → review → decision path still needs connected browser
acceptance testing. The previous bounded backlog remains: 26 unfinished mutation handlers plus
five no-op actions. This guide does not make those actions functional or establish production readiness.

Verification: focused formatting, lint and web typecheck passed. All 13 targeted checks passed
(nine walkthrough/navigation interactions and four existing sign-in route tests), including
required password-change and MFA redirects. Initial test selectors omitted the required-field
marker and queried a closed mobile menu; corrected selectors passed without changing authentication.
The production build and emitted-CSS check passed. Browser inspection confirmed the walkthrough
layout and Employer selection/email handoff. The existing signed-in account was correctly denied
access to the Employer example; this exposed a dead-end error screen. Added role-aware sign-in
and guide recovery links for 401/403 responses without exposing protected content or changing
authorization. All 23 focused tests passed (12 navigation/recovery interactions, four sign-in
route checks, four audit interactions and three QMS interactions). Focused lint and web typecheck
passed. The final production rebuild generated 98 pages and passed the emitted-CSS check.
Browser recheck at approximately 15:11 local time confirmed the denied record exposes
“Sign in for Employer”, that link preselects Employer at sign-in, and the guide return link works.
The existing user's account/preferences tabs were left unchanged; a separate tab is open at
`http://127.0.0.1:4300/`. No credentials, account security settings or application data were changed.

Local preview is running on port 4300. Timestamped command/output logs are in the parent
workspace's `logs` directory, including the run labelled `final-workflow-demo-preview`.

Hosting remains deferred; keep AWS inputs blank in the existing runbook.
