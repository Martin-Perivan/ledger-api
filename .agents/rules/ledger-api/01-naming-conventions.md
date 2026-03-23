# Rule: Naming Conventions

## TypeScript

- Variables, functions, parameters: `camelCase`
- Classes, interfaces, types, enums: `PascalCase`
- Enum members: `UPPER_SNAKE_CASE`
- Constants (module-level): `UPPER_SNAKE_CASE`
- Private class members: no underscore prefix — use `private` keyword
- Boolean variables: prefix with `is`, `has`, `can`, `should` (e.g., `isActive`, `hasBalance`)

## Files and Folders

- All files: `kebab-case` (e.g., `transfer.service.ts`, `risk-assessment.service.ts`)
- Folders: `kebab-case` (e.g., `value-objects/`, `middleware/`)
- Test files: `<module>.test.ts` (e.g., `ledger.service.test.ts`)
- One class/service/controller per file

## MongoDB

- Database name: `ledger` (lowercase)
- Collection names: lowercase plural, `camelCase` for multi-word (e.g., `users`, `accounts`, `ledgerEntries`, `idempotencyKeys`, `auditLogs`)
- Field names: `camelCase` (e.g., `accountId`, `createdAt`, `riskScore`, `balanceAfter`)
- Index names: `fieldName_direction` (e.g., `email_1`, `accountId_1_createdAt_-1`)
- Never use `snake_case` for MongoDB fields — `camelCase` is the community standard and is 7% more storage-efficient.

## API

- URL paths: `kebab-case`, lowercase, plural nouns (e.g., `/api/v1/transfers`, `/api/v1/accounts`)
- Query parameters: `camelCase` (e.g., `?accountId=...&fromDate=...`)
- JSON request/response fields: `camelCase` (consistent with MongoDB fields)
- HTTP headers: `Title-Case` with hyphens (e.g., `Idempotency-Key`, `Authorization`)
- Error codes: `UPPER_SNAKE_CASE` (e.g., `TRANSFER_BLOCKED`, `INSUFFICIENT_FUNDS`)

## Git

- Branch names: `feat/<short-description>`, `fix/<short-description>`, `docs/<short-description>`
- Commit messages: Conventional Commits in English (e.g., `feat: add transfer service with double-entry ledger`)
