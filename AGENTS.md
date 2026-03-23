# Ledger API — Agent Instructions

## Project Overview

**Ledger API** is a double-entry accounting engine for digital wallets, built for fintech environments. It exposes a RESTful API for account management, P2P transfers, deposits, and AI-powered fraud detection.

This project demonstrates production-grade backend architecture: transactional integrity, append-only ledger, idempotent operations, and layered security — all patterns used internally by neobanks and payment platforms.

## Agent Rules

- **All code, comments, commit messages, and documentation must be written in English.**
- Follow the rules defined in `.agents/rules/ledger-api/` for project-specific conventions.
- Follow the skills defined in `.agents/skills/backend-engineer/` for architectural and workflow patterns.
- Never generate code that violates the security constraints in `docs/audit-report.md`.
- Always validate against the API contract in `docs/api-reference.md` before implementing or modifying endpoints.
- When in doubt about a domain concept, check `docs/architecture.md` and `docs/decisions/`.

## Quick Reference

| Document                        | Purpose                                      |
| ------------------------------- | -------------------------------------------- |
| `docs/architecture.md`          | System design, layers, data flow              |
| `docs/api-reference.md`         | Endpoint contract (method, path, payload)      |
| `docs/audit-report.md`          | Security measures and threat model             |
| `docs/development.md`           | Local setup, env vars, scripts                 |
| `docs/roadmap.md`               | Planned improvements and next iterations       |
| `docs/status.md`                | Current build status per module                |
| `docs/decisions/*.md`           | ADRs — Architecture Decision Records          |
| `.agents/rules/ledger-api/`     | Project-specific coding rules                  |
| `.agents/skills/backend-engineer/` | Role skills: architecture, domain, workflows |

## Coding Standards (Summary)

- **Language**: TypeScript 5.x (strict mode)
- **Runtime**: Node.js 22 LTS
- **Package Manager**: pnpm
- **Naming**:
  - TypeScript: `camelCase` for variables/functions, `PascalCase` for classes/interfaces/types
  - MongoDB collections: lowercase plural (`accounts`, `ledgerEntries`, `transactions`)
  - MongoDB fields: `camelCase` (`accountId`, `createdAt`, `riskScore`)
  - Files/folders: `kebab-case` (`transfer.service.ts`, `risk-assessment/`)
- **No `any` type** — use `unknown` + type guards when the type is truly unknown.
- **No barrel exports** (`index.ts` re-exports) — import directly from the source module.
- **Error handling**: Use the Result pattern (`Success<T> | Failure<E>`) in services; never throw from business logic.
