# Ledger API

A **double-entry accounting engine** for digital wallets with AI-powered fraud detection. Built for fintech environments where transactional integrity, auditability, and security are non-negotiable.

```
Every cent is traceable. Every transaction is atomic. Every risk is assessed.
```

## What It Does

- **Digital Wallet Accounts** — Create and manage user accounts with real-time balance tracking.
- **P2P Transfers** — Move money between accounts using double-entry bookkeeping with MongoDB ACID transactions.
- **Deposits** — Fund accounts with idempotent operations that prevent duplicate processing.
- **AI Fraud Detection** — Every transfer is evaluated in real time by Claude API, which assigns a risk score and can block suspicious transactions.
- **Immutable Audit Trail** — Every action is logged in an append-only audit log for full traceability.

## Architecture

```
Client → API Gateway (Helmet, CORS, Rate Limit)
       → Auth Layer (JWT, Zod Validation)
       → Service Layer (Business Logic, Result Pattern)
       → Repository Layer (MongoDB Native Driver)
       → MongoDB Atlas (Transactions, Append-Only Ledger)
                ↕
         Claude API (Fraud Detection)
```

**Key design decisions:**
- **Double-entry ledger**: Every transfer creates two entries (debit + credit) that sum to zero — the same pattern used by banks worldwide.
- **Integer arithmetic**: All amounts stored in cents. No floating point. No rounding errors.
- **Idempotency**: Financial endpoints require an `Idempotency-Key` header to prevent duplicate operations.
- **Result pattern**: Services return `Result<T, E>` instead of throwing — explicit, type-safe error handling.

See [`docs/architecture.md`](docs/architecture.md) for the full system design and [`docs/decisions/`](docs/decisions/) for Architecture Decision Records (ADRs).

## Tech Stack

| Layer           | Technology                                  |
| --------------- | ------------------------------------------- |
| Runtime         | Node.js 24 LTS                              |
| Language        | TypeScript 5.x (strict mode)                |
| Framework       | Express.js                                  |
| Database        | MongoDB Atlas (native driver, transactions) |
| Validation      | Zod                                         |
| Authentication  | JWT (HS256) + bcrypt                        |
| AI Integration  | Anthropic Claude API (Sonnet)               |
| Logging         | pino                                        |
| Testing         | Jest + mongodb-memory-server                |
| CI / Security   | GitHub Actions + Trivy                      |
| Documentation   | Swagger (OpenAPI 3.0) + Postman Collection  |
| Deployment      | Railway (Dockerfile) + MongoDB Atlas         |
| Package Manager | pnpm                                        |

## Quick Start

```bash
# Prerequisites: Node.js 24+, pnpm, Docker

git clone https://github.com/Martin-Perivan/ledger-api.git
cd ledger-api
pnpm install
cp .env.example .env

# Start local authenticated MongoDB replica set
docker compose up -d

# Seed demo users and accounts
pnpm run seed

# Start development server
pnpm run dev
```

The repository includes a `.node-version` file for Node.js 24 tooling alignment.
Local development uses a single-node authenticated MongoDB replica set in Docker with the `ledger` database and an `admin` application user. Production and staging use MongoDB Atlas.
See [`docs/development.md`](docs/development.md) for the full setup guide.

For Railway deployments, the API ships as a Docker image with:
- Chainguard Node 24 base images
- Non-root runtime user
- Container health check against `GET /health`
- Explicit CORS origin whitelist via `CORS_ORIGIN`

## Common Commands

| Command            | Description |
| ------------------ | --------------------------------------------- |
| `pnpm run dev`     | Start the development server with `tsx watch` |
| `pnpm run lint`    | Run ESLint across `src/` and `tests/`         |
| `pnpm run test`    | Run the Jest test suite                       |
| `pnpm run build`   | Compile TypeScript to `dist/`                 |
| `pnpm run seed`    | Seed demo users and wallet accounts           |
| `pnpm run swagger` | Load the Swagger/OpenAPI configuration module  |

## API Endpoints

| Method | Path                                   | Description                | Auth |
| ------ | -------------------------------------- | -------------------------- | ---- |
| POST   | `/api/v1/auth/register`                | Create user account        | No   |
| POST   | `/api/v1/auth/login`                   | Authenticate, get JWT      | No   |
| POST   | `/api/v1/accounts`                     | Create digital wallet      | Yes  |
| GET    | `/api/v1/accounts`                     | List user's accounts       | Yes  |
| GET    | `/api/v1/accounts/:accountId`          | Account details + balance  | Yes  |
| GET    | `/api/v1/accounts/:accountId/history`  | Paginated ledger entries   | Yes  |
| POST   | `/api/v1/deposits`                     | Deposit funds (idempotent) | Yes  |
| POST   | `/api/v1/transfers`                    | P2P transfer + fraud check | Yes  |

Operational endpoint: `GET /health`

Full contract with request/response examples: [`docs/api-reference.md`](docs/api-reference.md)

Import the [Postman Collection](postman_collection.json) for ready-to-use requests.

## Security

| Measure                    | Implementation                          |
| -------------------------- | --------------------------------------- |
| Input validation           | Zod schemas on every endpoint           |
| Password storage           | bcrypt (12 salt rounds)                 |
| Authentication             | JWT with 1-hour expiry                  |
| HTTP hardening             | Helmet.js (CSP, HSTS, X-Frame-Options)  |
| Rate limiting              | Per-IP and per-user limits              |
| CORS                       | Explicit origin whitelist from env      |
| Idempotency                | UUID-based deduplication on writes      |
| Transactional integrity    | MongoDB multi-document transactions     |
| Fraud detection            | AI risk scoring on every transfer       |
| Audit trail                | Immutable append-only log               |
| NoSQL injection prevention | Parameterized queries with `$eq`        |
| Container runtime          | Chainguard Node 24 + non-root user      |
| Supply chain checks        | `--frozen-lockfile` + Trivy CI scanning  |

Full security audit: [`docs/audit-report.md`](docs/audit-report.md)

## Fraud Detection

Every P2P transfer is analyzed by Claude API before execution:

```
Transfer request → Risk Assessment Service → Claude API
                                               ↓
                                         { riskScore: 78,
                                           riskLevel: "HIGH",
                                           flags: ["unusual_amount", "new_recipient"] }
                                               ↓
                              HIGH → Block (403) | MEDIUM → Proceed + Flag | LOW → Proceed
```

If the AI service is unavailable, hardcoded fallback rules ensure the system remains operational. See [`docs/decisions/003-fraud-detection-ai.md`](docs/decisions/003-fraud-detection-ai.md).

## Project Structure

```
docs/             — Architecture, API contract, setup, walkthrough, status, and ADRs
tests/            — Service-layer unit tests and test helpers
src/
├── config/         — Database, environment, and Swagger setup
├── controllers/    — HTTP request and response orchestration
├── domain/         — Entities, enums, value objects, and constants
├── middleware/     — Gateway, auth, validation, idempotency, rate limit, and headers
├── repositories/   — MongoDB data access layer
├── routes/         — Express route definitions
├── schemas/        — Zod validation schemas
├── services/       — Business logic using the Result pattern
├── types/          — Express type augmentation
├── utils/          — Result type, logger, hash, response, and token helpers
├── app.ts          — Express app factory
├── seed.ts         — Demo seed entrypoint used by `pnpm run seed`
└── server.ts       — Runtime entrypoint
```

## Documentation

| Document                                              | Description                       |
| ----------------------------------------------------- | --------------------------------- |
| [`docs/architecture.md`](docs/architecture.md)        | System design and data flow        |
| [`docs/api-reference.md`](docs/api-reference.md)      | Full endpoint contract            |
| [`docs/audit-report.md`](docs/audit-report.md)        | Security measures and OWASP map   |
| [`docs/development.md`](docs/development.md)          | Local setup and scripts           |
| [`docs/roadmap.md`](docs/roadmap.md)                  | Planned improvements              |
| [`docs/decisions/`](docs/decisions/)                  | Architecture Decision Records     |
| [`docs/walkthrough.md`](docs/walkthrough.md)          | Hands-on walkthrough and testing  |

## Repository Guidance

| Path                                                                   | Description              |
| ---------------------------------------------------------------------- | ------------------------ |
| [`AGENTS.md`](AGENTS.md)                                               | Agent execution contract and repository loading order |
| [`.agents/rules/ledger-api/`](.agents/rules/ledger-api/)               | Detailed project rules for naming, errors, security, database, and responses |
| [`.agents/skills/backend-engineer/`](.agents/skills/backend-engineer/) | Canonical backend skill materials for architecture, domain logic, and workflows |
| [`.trae/skills/skill-md/SKILL.md`](.trae/skills/skill-md/SKILL.md)     | Trae bridge that routes to the canonical backend skill |

`README.md` stays user-facing, while `AGENTS.md` and `.agents/` define the repository guidance used by coding agents and IDE integrations.

## Roadmap

See [`docs/roadmap.md`](docs/roadmap.md) for planned improvements including:
- RS256 JWT migration
- Refresh token rotation
- Multi-currency support
- Webhooks
- OpenTelemetry observability

## License

MIT

## Author

**José Martín Perivan Lluvias**
Senior Backend Engineer
[GitHub](https://github.com/Martin-Perivan) · [LinkedIn](https://www.linkedin.com/in/martin-perivan-b05a17166/)
