# Defect Register

Severity: P0 (release-blocking, safety/security) · P1 (major) · P2 (moderate) · P3 (minor).

| ID      | Severity | Summary                                                           | Found in                           | Status   | Resolution                                                                                 |
| ------- | -------- | ----------------------------------------------------------------- | ---------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| DEF-001 | P1       | Clean clone tests depended on an ignored `coverage/` CSV          | `screen-inventory.test.ts`         | Resolved | Inventory is derived from the 125 tracked, hash-verified SVG sources.                      |
| DEF-002 | P1       | “244/244 concrete” set omitted `post_candidates_merge_preview`    | `concrete-dispatch.ts`             | Resolved | Added the operation and an executable manifest-to-dispatch equality test.                  |
| DEF-003 | P1       | Authentication operations were routed through the profile handler | `concrete-dispatch.ts`             | Resolved | Each operation now uses its contract handler and provider-dependent behavior fails closed. |
| DEF-004 | P2       | Latest platform commit failed format/lint                         | four platform implementation files | Resolved | Reformatted files, removed dead members and restored a clean `pnpm verify`.                |
