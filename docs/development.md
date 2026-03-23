# Development Guide

## Prerequisites

- Node.js 22 LTS via `fnm` (`fnm install 22 && fnm use 22`)
- pnpm 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- A `.node-version` file is included in the repo root — `fnm` auto-switches when you `cd` into the project (requires `eval "$(fnm env --use-on-cd)"` in your shell config).
- Docker + Docker Compose (for local MongoDB replica set)
- MongoDB Atlas account (for production/staging)
- Anthropic API key (for fraud detection)

## Initial Setup

```bash
# Clone the repository
git clone git@github.com:Martin-Perivan/ledger-api.git
cd ledger-api

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Start local MongoDB replica set
docker compose up -d

# Run database seed (optional, creates test users + accounts)
pnpm run seed

# Start development server
pnpm run dev
```

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>/?retryWrites=true&appName=<app-name>
DATABASE_NAME=ledger

# JWT
JWT_SECRET=<64-char-random-string>
JWT_EXPIRES_IN=3600

# Anthropic (Fraud Detection)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
RISK_ASSESSMENT_TIMEOUT_MS=3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm run dev`      | Start dev server with hot reload (tsx)   |
| `pnpm run build`    | Compile TypeScript to `dist/`            |
| `pnpm run start`    | Run compiled production build            |
| `pnpm run test`     | Run Jest test suite                      |
| `pnpm run test:cov` | Run tests with coverage report           |
| `pnpm run lint`     | Run ESLint                               |
| `pnpm run seed`     | Seed database with test data             |
| `pnpm run swagger`  | Generate Swagger JSON at `/api-docs`     |

## Docker Compose (Local MongoDB Replica Set)

The `docker-compose.yml` starts a 3-node MongoDB replica set locally, required for multi-document transactions:

```yaml
services:
  mongo1:
    image: mongo:7
    command: mongod --replSet rs0 --port 27017
    ports:
      - "27017:27017"
    volumes:
      - mongo1_data:/data/db

  mongo2:
    image: mongo:7
    command: mongod --replSet rs0 --port 27018
    ports:
      - "27018:27018"
    volumes:
      - mongo2_data:/data/db

  mongo3:
    image: mongo:7
    command: mongod --replSet rs0 --port 27019
    ports:
      - "27019:27019"
    volumes:
      - mongo3_data:/data/db

volumes:
  mongo1_data:
  mongo2_data:
  mongo3_data:
```

After first `docker compose up`, initialize the replica set:
```bash
docker exec -it ledger-api-mongo1-1 mongosh --eval '
  rs.initiate({
    _id: "rs0",
    members: [
      { _id: 0, host: "mongo1:27017" },
      { _id: 1, host: "mongo2:27018" },
      { _id: 2, host: "mongo3:27019" }
    ]
  })
'
```

> **Note**: MongoDB Atlas (production) already runs as a replica set — no special configuration needed.

## Project Conventions

- **Commits**: Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- **Branches**: `main` (production), `develop` (integration), `feat/<name>` (features).
- **Code style**: ESLint + Prettier (configured in project).
- **All code in English**: Comments, variable names, commit messages, documentation.

## Deployment (Railway)

1. Connect GitHub repo to Railway.
2. Set all environment variables in Railway dashboard.
3. Set `MONGODB_URI` to your MongoDB Atlas connection string.
4. Railway auto-detects Node.js and runs `pnpm run build && pnpm run start`.
5. Custom start command (if needed): `node dist/server.js`.
6. Enable auto-deploy on push to `main`.

## Testing

```bash
# Run all tests
pnpm run test

# Run specific test file
pnpm run test -- ledger.service.test.ts

# Run with coverage
pnpm run test:cov
```

Tests use `mongodb-memory-server` for an in-memory MongoDB instance with replica set support. No external database needed for testing.
