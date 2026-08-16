# Next Action — exactly one executable slice

## CPF-06 authenticated web/API migration

**Goal:** remove process-local state from the next complete browser journey and prove that its
ready, empty, error and denied states come from authenticated platform API responses.

**Selection rule:** choose the highest-priority route whose OpenAPI operation and PostgreSQL
repository already exist; do not invent a public endpoint for EMP-11, EMP-15, GOV-09 or OPS-02.

**Implementation:**

1. Add one typed server-side platform API adapter with bounded timeout, correlation propagation,
   bearer-session forwarding and RFC 9457 problem mapping.
2. Move the selected Next route handlers away from `synthetic.server.ts` without changing the
   canonical route or visual contract.
3. Prove missing, expired, wrong-role and cross-tenant sessions return the correct 401/403/404
   behavior without leaking resource existence.
4. Add PostgreSQL integration, browser interaction and route-state evidence.
5. Update the requirement ledger only for the exact requirements proven by those tests.

**Completion condition:** the selected journey has no process-local store dependency, persists and
rehydrates through PostgreSQL, passes session/tenant negative tests, and has visual/accessibility
evidence for ready, empty, error and denied states.
