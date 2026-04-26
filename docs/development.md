# Development Guide

## Prerequisites

- Node.js 24 LTS via `fnm` (`fnm install 24 && fnm use 24`)
- pnpm 10.29.3 (`corepack enable && corepack use pnpm@10.29.3`)
- A `.node-version` file is included in the repo root — `fnm` auto-switches when you `cd` into the project (requires `eval "$(fnm env --use-on-cd)"` in your shell config).
- Docker + Docker Compose (for local authenticated MongoDB replica set)
- MongoDB Atlas account (for production/staging)
- Anthropic API key (for fraud detection)

## Initial Setup

```bash
# Clone the repository
git clone https://github.com/Martin-Perivan/ledger-api.git
cd ledger-api

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Start local authenticated MongoDB replica set
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
MONGODB_URI=mongodb://admin:Admin321@localhost:27017/ledger?replicaSet=rs0&authSource=ledger
DATABASE_NAME=ledger
LOCAL_MONGODB_DATABASE=ledger
LOCAL_MONGODB_ROOT_USERNAME=root
LOCAL_MONGODB_ROOT_PASSWORD=RootAdmin321
LOCAL_MONGODB_APP_USERNAME=admin
LOCAL_MONGODB_APP_PASSWORD=Admin321

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
CORS_ORIGIN=http://localhost:3000,https://your-frontend.example.com
```

`CORS_ORIGIN` accepts a comma-separated whitelist of absolute origins. Requests without an `Origin` header, such as Postman, curl, or other server-to-server clients, continue to work.

The `LOCAL_MONGODB_*` values and the sample `MONGODB_URI` above are local Docker defaults only. Do not reuse them in shared, staging, or production environments.

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `pnpm run dev`      | Start dev server with hot reload (tsx)       |
| `pnpm run build`    | Compile TypeScript to `dist/`                |
| `pnpm run start`    | Run compiled production build                |
| `pnpm run test`     | Run Jest test suite                          |
| `pnpm run test:cov` | Run tests with coverage report               |
| `pnpm run lint`     | Run ESLint                                   |
| `pnpm run seed`     | Seed database with test data                 |
| `pnpm run swagger`  | Load the Swagger/OpenAPI configuration module |

## Docker Compose (Local MongoDB Replica Set)

The `docker-compose.yml` starts a single-node authenticated MongoDB replica set locally. A single replica set member is sufficient for MongoDB transactions in local development, while production and staging continue to use MongoDB Atlas.

```yaml
services:
  mongo:
    image: mongo:7
    command: ["mongod", "--bind_ip_all", "--replSet", "rs0", "--auth", "--port", "27017"]
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: RootAdmin321
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD-SHELL", "mongosh --quiet --username $$MONGO_INITDB_ROOT_USERNAME --password $$MONGO_INITDB_ROOT_PASSWORD --authenticationDatabase admin --eval \"db.adminCommand({ ping: 1 }).ok\" | grep 1"]

  mongo-init:
    image: mongo:7
    depends_on:
      mongo:
        condition: service_healthy
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: RootAdmin321
      LOCAL_MONGODB_DATABASE: ledger
      LOCAL_MONGODB_APP_USERNAME: admin
      LOCAL_MONGODB_APP_PASSWORD: Admin321
    volumes:
      - ./docker/mongo-init.sh:/scripts/mongo-init.sh:ro
    entrypoint: ["bash", "/scripts/mongo-init.sh"]

volumes:
  mongo_data:
```

After `docker compose up -d`, the one-off `mongo-init` service runs `docker/mongo-init.sh` to:

- Initialize the local replica set as `rs0`
- Create the application database `ledger`
- Create the application user `admin` with the built-in `readWrite` role on `ledger`

The `readWrite` role is sufficient for the application because the API reads and writes collections in `ledger`, creates collections when needed, and creates indexes at startup. The root user exists only to bootstrap the local container.

You can inspect the bootstrap service with:

```bash
docker compose logs mongo-init
```

If you need to reset the local database and rerun the bootstrap process:

```bash
docker compose down -v
docker compose up -d
```

For production and staging, set `MONGODB_URI` to your MongoDB Atlas connection string instead of the local Docker value.

## Project Conventions

- **Commits**: Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- **Branches**: `main` (production), `develop` (integration), `feat/<name>` (features).
- **Code style**: ESLint and the existing repository conventions.
- **All code in English**: Comments, variable names, commit messages, documentation.

## Deployment (Railway)

1. Connect GitHub repo to Railway.
2. Set all environment variables in Railway dashboard.
3. Set `MONGODB_URI` to your MongoDB Atlas connection string.
4. Deploy using the repository `Dockerfile` (Railway detects and builds it automatically).
5. Configure the health check path as `/health`.
6. Add Railway's outbound IP to MongoDB Atlas Network Access. For temporary testing only, `0.0.0.0/0` can confirm an allowlist issue, but production should use a fixed outbound IP or an equivalent restricted rule.
7. Set `CORS_ORIGIN` to an explicit whitelist. If you only test with Postman, `http://localhost:3000` is a safe placeholder until the frontend exists.
8. Enable auto-deploy on push to `main`.

## CI and Supply Chain Checks

The GitHub Actions workflow validates every push to `main` and every pull request with:

- `pnpm install --frozen-lockfile`
- `pnpm run lint`
- `pnpm run test -- --runInBand`
- `pnpm run build`
- Trivy filesystem scan for vulnerabilities, secrets, and misconfigurations
- Trivy image scan against the built Docker image

## Testing

```bash
# Run all tests
pnpm run test

# Run specific test file
pnpm run test -- transfer.service.test.ts

# Run with coverage
pnpm run test:cov
```

Tests use `mongodb-memory-server` for an in-memory MongoDB instance with replica set support. No external database needed for testing.
