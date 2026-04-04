# Ledger API - Agent Instructions

Execution contract for coding agents in this repository.

This file is the canonical entrypoint for agent behavior in this repository.

## Project Overview

**Ledger API** is a double-entry accounting engine for digital wallets, built for fintech environments. It exposes a RESTful API for account management, P2P transfers, deposits, and AI-powered fraud detection.

This project demonstrates production-grade backend architecture: transactional integrity, append-only ledger, idempotent financial operations, and layered API security — all patterns used internally by neobanks and payment platforms.

## Agent Rules

- **All code, comments, commit messages, and documentation must be written in English.**
- Read this file first, then load the relevant materials from `.agents/rules/` and `.agents/skills/`.
- Treat `.agents/rules/` as the primary source for detailed project-specific conventions.
- Treat `.agents/skills/` as the source for reusable implementation workflows and role-specific guidance.
- The current rule set lives under `.agents/rules/ledger-api/`.
- Use the relevant skill under `.agents/skills/` for the task at hand. For backend and API work, use `.agents/skills/backend-engineer/`.
- Use `README.md` for setup, development workflow, and user-facing project context before changing human-facing behavior.
- Keep `README.md` user-facing and keep `AGENTS.md` focused on agent execution guidance.
- Never generate code that violates the security constraints in `docs/audit-report.md`.
- Always validate against the API contract in `docs/api-reference.md` before implementing or modifying endpoints.
- When in doubt about architecture or domain behavior, check `docs/architecture.md` and `docs/decisions/`.
- Validate code changes with `pnpm run lint`, `pnpm run test`, and `pnpm run build` when the task affects runtime behavior or public contracts.

## Quick Reference

| Document/Path | Purpose |
| --- | --- |
| `AGENTS.md` | Canonical agent entrypoint and loading contract |
| `README.md` | Setup, runtime overview, and user-facing workflow |
| `docs/architecture.md` | System design, layers, and data flow |
| `docs/api-reference.md` | Endpoint contract, request payloads, and responses |
| `docs/audit-report.md` | Security constraints, threat model, and implementation boundaries |
| `docs/development.md` | Local setup, environment variables, and scripts |
| `docs/status.md` | Current module completion status |
| `docs/roadmap.md` | Planned improvements and future iterations |
| `docs/decisions/*.md` | ADRs and architecture rationale |
| `.agents/rules/` | Primary detailed rule sets for this repository |
| `.agents/rules/ledger-api/` | Current rule set for naming, errors, security, database, and responses |
| `.agents/skills/` | Reusable skills and workflows for agents when present |
| `.agents/skills/backend-engineer/` | Primary skill set for backend architecture, domain logic, fraud workflows, and validation |
| `.trae/skills/skill-md/SKILL.md` | Trae-specific bridge to the canonical skills in `.agents/skills/` |

## Documentation Authority

- `README.md` is the human-facing source for setup, workflow, scripts, and repository navigation.
- `AGENTS.md` is the agent-facing execution contract and the project entrypoint for repository guidance.
- `.agents/rules/` contains the detailed project-specific rules that expand this contract.
- `.agents/rules/ledger-api/` is the current rule set used by this repository.
- `.agents/skills/` contains the reusable implementation workflows consumed by agents and IDE integrations.
- `.agents/skills/backend-engineer/` is the current primary skill for backend work in this repository.
- `.trae/skills/skill-md/SKILL.md` is a Trae-specific bridge that points to the canonical skill materials in `.agents/skills/`.
- `docs/api-reference.md`, `docs/architecture.md`, and `docs/audit-report.md` remain the canonical detailed references for API behavior, system design, and security boundaries.

## Mandatory Preflight

For every task, apply this exact startup order:

1. Read `AGENTS.md`
2. Load any relevant files from `.agents/rules/` and `.agents/skills/` when applicable
3. Continue only after the relevant instructions are loaded

This file defines the loading contract for repository-specific agent rules. Preserve backward compatibility with the documented API and the established service architecture when implementing changes.

## Rule Set

Detailed repository rules live under `.agents/rules/`.
Load the relevant rule set for the current task and apply numbered rule files in ascending order within that set.
The current repository rule set is `.agents/rules/ledger-api/`.
If two instructions appear to conflict, apply the stricter rule and preserve security, API compatibility, and financial correctness.

### Rule Files

| Rule File | Scope |
| --- | --- |
| `.agents/rules/ledger-api/01-naming-conventions.md` | TypeScript naming, file naming, and collection naming standards |
| `.agents/rules/ledger-api/02-error-handling.md` | Result pattern, error propagation, and controller/service boundaries |
| `.agents/rules/ledger-api/03-security-rules.md` | Security constraints, validation, authentication, and secret handling |
| `.agents/rules/ledger-api/04-database-rules.md` | MongoDB modeling, transactions, indexes, and append-only guarantees |
| `.agents/rules/ledger-api/05-api-response-format.md` | Standard response envelopes and response helper conventions |

## Validation Commands

Use these commands whenever API behavior, business logic, contracts, or repository guidance changes:

```bash
pnpm run lint
pnpm run test
pnpm run build
```

## Skills

Primary skill entrypoints:

| Skill Path | Purpose |
| --- | --- |
| `.agents/skills/` | Canonical root for project skills and reusable workflows |
| `.agents/skills/backend-engineer/` | Detailed project skill files for architecture, domain, fraud detection, and workflows |
| `.trae/skills/skill-md/SKILL.md` | Trae-specific bridge that points to `.agents/skills/backend-engineer/` |

## Coding Standards

- **Language**: TypeScript 5.x in strict mode
- **Runtime**: Node.js 24 LTS
- **Package Manager**: pnpm
- **Naming**:
  - TypeScript: `camelCase` for variables and functions, `PascalCase` for classes, interfaces, and types
  - MongoDB collections: lowercase plural (`accounts`, `ledgerEntries`, `transactions`)
  - MongoDB fields: `camelCase` (`accountId`, `createdAt`, `riskScore`)
  - Files and folders: `kebab-case` (`transfer.service.ts`, `risk-assessment/`)
- **No `any` type** — use `unknown` with narrowing when a type is truly unknown.
- **No barrel exports** (`index.ts` re-exports) — import directly from the source module.
- **Error handling**: Use the Result pattern (`Success<T> | Failure<E>`) in services; never throw from business logic.

## When in Doubt

If a task touches security, API contracts, transactional behavior, fraud detection, or repository guidance, consult the relevant rule file first and avoid guessing.
