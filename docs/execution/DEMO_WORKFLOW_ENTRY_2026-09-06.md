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

Verification results are recorded in the next saved checkpoint after the scoped checks run.
Hosting remains deferred; keep AWS inputs blank in the existing runbook.
