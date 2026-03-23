/**
 * Express application factory with manual dependency injection.
 * Wires repositories → services → controllers → routes.
 * @module app
 */

import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import { Db, MongoClient } from "mongodb";

import { env } from "./config/environment.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { responseHeadersMiddleware } from "./middleware/response-headers.middleware.js";
import { globalLimiter } from "./middleware/rate-limit.middleware.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import { createIdempotencyMiddleware } from "./middleware/idempotency.middleware.js";
import { createApiRoutes } from "./routes/index.js";
import { setupSwagger } from "./config/swagger.js";

import { UserRepository } from "./repositories/user.repository.js";
import { AccountRepository } from "./repositories/account.repository.js";
import { LedgerEntryRepository } from "./repositories/ledger-entry.repository.js";
import { TransactionRepository } from "./repositories/transaction.repository.js";
import { IdempotencyRepository } from "./repositories/idempotency.repository.js";
import { AuditLogRepository } from "./repositories/audit-log.repository.js";

import { AuthService } from "./services/auth.service.js";
import { AccountService } from "./services/account.service.js";
import { DepositService } from "./services/deposit.service.js";
import { TransferService } from "./services/transfer.service.js";
import { RiskAssessmentService } from "./services/risk-assessment.service.js";

import { AuthController } from "./controllers/auth.controller.js";
import { AccountController } from "./controllers/account.controller.js";
import { DepositController } from "./controllers/deposit.controller.js";
import { TransferController } from "./controllers/transfer.controller.js";

function createApp(db: Db, client: MongoClient): Express {
  const app = express();

  // Railway / PaaS reverse proxy – trust the immediate load balancer
  // so req.ip reflects the real client address (needed by rate limiters).
  app.set("trust proxy", 1);

  // --- Gateway middleware ---
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Idempotency-Key",
      ],
    })
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(requestIdMiddleware);
  app.use(responseHeadersMiddleware);
  app.use(globalLimiter);

  // --- Repositories ---
  const userRepo = new UserRepository(db);
  const accountRepo = new AccountRepository(db);
  const ledgerEntryRepo = new LedgerEntryRepository(db);
  const transactionRepo = new TransactionRepository(db);
  const idempotencyRepo = new IdempotencyRepository(db);
  const auditLogRepo = new AuditLogRepository(db);

  // --- Services ---
  const authService = new AuthService(userRepo);
  const accountService = new AccountService(accountRepo, ledgerEntryRepo);
  const riskService = new RiskAssessmentService(transactionRepo);
  const depositService = new DepositService(
    accountRepo,
    ledgerEntryRepo,
    transactionRepo,
    idempotencyRepo,
    auditLogRepo,
    client
  );
  const transferService = new TransferService(
    accountRepo,
    ledgerEntryRepo,
    transactionRepo,
    idempotencyRepo,
    auditLogRepo,
    riskService,
    client
  );

  // --- Controllers ---
  const authController = new AuthController(authService);
  const accountController = new AccountController(accountService);
  const depositController = new DepositController(depositService);
  const transferController = new TransferController(transferService);

  // --- Idempotency middleware ---
  const idempotencyMiddleware = createIdempotencyMiddleware(idempotencyRepo);

  // --- Routes ---
  app.use(
    "/api/v1",
    createApiRoutes({
      authController,
      accountController,
      depositController,
      transferController,
      idempotencyMiddleware,
    })
  );

  // --- Swagger ---
  setupSwagger(app);

  // --- Health check ---
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // --- Error handler (must be last) ---
  app.use(errorHandler);

  return app;
}

export { createApp };
