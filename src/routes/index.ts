/**
 * Route aggregator — mounts all domain routes under /api/v1.
 * @module routes/index
 */

import { Router } from "express";

import { type AuthController } from "../controllers/auth.controller.js";
import { type AccountController } from "../controllers/account.controller.js";
import { type DepositController } from "../controllers/deposit.controller.js";
import { type TransferController } from "../controllers/transfer.controller.js";
import { createAuthRoutes } from "./auth.routes.js";
import { createAccountRoutes } from "./account.routes.js";
import { createDepositRoutes } from "./deposit.routes.js";
import { createTransferRoutes } from "./transfer.routes.js";
import {
  authLimiter,
  transferLimiter,
  depositLimiter,
  accountCreationLimiter,
} from "../middleware/rate-limit.middleware.js";

interface RouteControllers {
  authController: AuthController;
  accountController: AccountController;
  depositController: DepositController;
  transferController: TransferController;
  idempotencyMiddleware: ReturnType<typeof import("../middleware/idempotency.middleware.js").createIdempotencyMiddleware>;
}

function createApiRoutes(controllers: RouteControllers): Router {
  const router = Router();

  router.use("/auth", authLimiter, createAuthRoutes(controllers.authController));
  router.use(
    "/accounts",
    createAccountRoutes(controllers.accountController, accountCreationLimiter)
  );
  router.use(
    "/deposits",
    depositLimiter,
    createDepositRoutes(
      controllers.depositController,
      controllers.idempotencyMiddleware
    )
  );
  router.use(
    "/transfers",
    transferLimiter,
    createTransferRoutes(
      controllers.transferController,
      controllers.idempotencyMiddleware
    )
  );

  return router;
}

export { createApiRoutes };
export type { RouteControllers };
