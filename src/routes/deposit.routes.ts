/**
 * Deposit routes for funding accounts.
 * Requires JWT authentication and idempotency key.
 * @module routes/deposit
 */

import { Router } from "express";

import { type DepositController } from "../controllers/deposit.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createDepositSchema } from "../schemas/deposit.schema.js";

function createDepositRoutes(
  depositController: DepositController,
  idempotencyMiddleware: ReturnType<typeof import("../middleware/idempotency.middleware.js").createIdempotencyMiddleware>
): Router {
  const router = Router();

  router.post(
    "/",
    authMiddleware,
    validate({ body: createDepositSchema }),
    idempotencyMiddleware,
    depositController.execute.bind(depositController)
  );

  return router;
}

export { createDepositRoutes };
