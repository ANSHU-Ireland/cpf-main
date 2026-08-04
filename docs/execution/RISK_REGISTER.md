# Risk Register

| ID      | Risk                                                                                                     | Category | Likelihood | Impact   | Mitigation                                                                      | Status     |
| ------- | -------------------------------------------------------------------------------------------------------- | -------- | ---------- | -------- | ------------------------------------------------------------------------------- | ---------- |
| RISK-01 | Local DB unavailable (no Docker) delays DB/RLS defence-in-depth validation.                              | Delivery | High       | Medium   | Author tests now, gate on pg availability; resolve EXT-01.                      | Open       |
| RISK-02 | AI safety invariants (no AI score/rank/verdict) regress silently as surface area grows.                  | Safety   | Medium     | Critical | 100% branch-covered invariant module + forbidden-output regression suite in CI. | Mitigating |
| RISK-03 | Tenant isolation gaps (IDOR / cross-tenant) as endpoints multiply.                                       | Security | Medium     | Critical | Deny-by-default policy engine + RLS + cross-tenant negative tests per slice.    | Planned    |
| RISK-04 | DTO drift between OpenAPI and code.                                                                      | Contract | Medium     | High     | Generate/validate types from OpenAPI; CI diff gate.                             | Planned    |
| RISK-05 | Scope is very large (362 reqs / 244 ops / 125 screens); partial builds risk shipping mock-only surfaces. | Delivery | High       | High     | Strict vertical-slice loop; no requirement marked done without evidence.        | Managing   |
