# Workflows

## Session Workflow

When starting a new coding session, follow this order:

1. **Read status**: Check `docs/status.md` to see what's done and what's next.
2. **Pick the next module**: Work in dependency order (see Build Order below).
3. **Read relevant docs**: Check `docs/api-reference.md` for endpoints, `docs/architecture.md` for structure.
4. **Generate code**: Follow the layer order — domain → repository → service → controller → route.
5. **Test**: Write or run tests for the completed module.
6. **Update status**: Mark the module as complete in `docs/status.md`.

## Build Order

Modules must be built in this order due to dependencies:

```
1. Project Setup
   ├── package.json, tsconfig.json, .env.example, .gitignore
   ├── Docker Compose (local MongoDB replica set)
   ├── src/config/environment.ts (Zod-validated env vars)
   ├── src/config/database.ts (MongoClient + index creation)
   ├── src/utils/result.ts (Result pattern)
   └── src/utils/logger.ts (pino)

2. Domain Layer
   ├── src/domain/enums/*.ts
   ├── src/domain/entities/*.ts
   └── src/domain/value-objects/*.ts

3. Auth Module
   ├── src/repositories/user.repository.ts
   ├── src/services/auth.service.ts
   ├── src/schemas/auth.schema.ts
   ├── src/middleware/auth.middleware.ts
   ├── src/utils/hash.ts + src/utils/token.ts
   ├── src/controllers/auth.controller.ts
   └── src/routes/auth.routes.ts

4. Account Module
   ├── src/repositories/account.repository.ts
   ├── src/services/account.service.ts
   ├── src/schemas/account.schema.ts
   ├── src/controllers/account.controller.ts
   └── src/routes/account.routes.ts

5. Deposit Module
   ├── src/repositories/ledger-entry.repository.ts
   ├── src/repositories/transaction.repository.ts
   ├── src/repositories/idempotency.repository.ts
   ├── src/middleware/idempotency.middleware.ts
   ├── src/services/deposit.service.ts
   ├── src/schemas/deposit.schema.ts
   ├── src/controllers/deposit.controller.ts
   └── src/routes/deposit.routes.ts

6. Transfer Module (depends on 5 for shared repos)
   ├── src/services/risk-assessment.service.ts
   ├── src/services/transfer.service.ts
   ├── src/schemas/transfer.schema.ts
   ├── src/controllers/transfer.controller.ts
   └── src/routes/transfer.routes.ts

7. Middleware Stack
   ├── src/middleware/rate-limit.middleware.ts
   ├── src/middleware/error-handler.middleware.ts
   └── src/middleware/validate.middleware.ts
   (Note: auth.middleware and idempotency.middleware are built in steps 3 and 5)

8. App Assembly
   ├── src/routes/index.ts (route aggregator)
   ├── src/app.ts (Express factory with DI wiring)
   └── src/server.ts (entry point)

9. Swagger + Postman
   ├── src/config/swagger.ts
   └── postman_collection.json

10. Tests
    ├── tests/helpers/test-db.ts
    ├── tests/unit/ledger.service.test.ts
    ├── tests/unit/transfer.service.test.ts
    └── tests/unit/risk-assessment.service.test.ts

11. Deploy
    ├── Dockerfile
    ├── README.md
    └── Railway configuration
```

## File Generation Template

When generating a new file, follow this structure:

```typescript
/**
 * <Brief description of what this file does>.
 * @module <module-name>
 */

// Node.js built-ins
import { ObjectId } from "mongodb"; // if needed

// External packages
import { z } from "zod";

// Internal modules
import { type AppError } from "../utils/result";

// Implementation...

// Export (named exports, no default)
export { ClassName };
export type { InterfaceName };
```

## Commit Workflow

After completing each module:

```bash
git add -A
git commit -m "feat: <module description>"
```

Example commits:
```
feat: add project setup with TypeScript, pnpm, and Docker Compose
feat: implement domain entities, enums, and value objects
feat: add auth module with JWT and bcrypt
feat: add account CRUD with balance queries
feat: implement deposit with idempotency and ledger entries
feat: add P2P transfers with double-entry ledger and fraud detection
feat: configure middleware stack (helmet, cors, rate limit)
feat: wire app factory with dependency injection
feat: add Swagger docs and Postman collection
test: add unit tests for ledger, transfer, and risk services
feat: add Dockerfile and README
chore: deploy to Railway with MongoDB Atlas
```
