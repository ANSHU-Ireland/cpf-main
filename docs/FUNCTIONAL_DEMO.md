# CPF functional demo

This repository includes a local functional-demo mode for exercising the primary CPF workspaces with deterministic Northstar sample data.

## Start the demo

From the repository root:

```powershell
corepack pnpm@10.22.0 demo:start
```

Open `http://127.0.0.1:4300/sign-in` and use one of the workspace cards. Every demo identity uses the password `CPF-DEMO-2026`.

| Workspace      | Demo identity                     |
| -------------- | --------------------------------- |
| Candidate      | `candidate.one@northstar.invalid` |
| Reviewer       | `reviewer@northstar.invalid`      |
| Employer       | `admin@northstar.invalid`         |
| Platform admin | `admin@northstar.invalid`         |
| Governance     | `admin@northstar.invalid`         |
| Operations     | `admin@northstar.invalid`         |
| Support        | `admin@northstar.invalid`         |

The employer approver identity is `approver@northstar.invalid` when an approval-specific journey is needed.

## Check the demo

With the demo running, execute:

```powershell
corepack pnpm@10.22.0 demo:smoke
```

The smoke check signs into every primary role and checks 23 representative API-backed journeys.

## Scope and safety

Demo behavior is enabled only when `CPF_DEMO_MODE=true`. Normal runtime behavior remains fail-closed: incomplete production contracts are not replaced with synthetic responses, and external systems are not simulated as real integrations. The demo is intended for local product review, not production deployment or production data.
