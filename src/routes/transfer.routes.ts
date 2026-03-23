/**
 * Transfer routes for P2P transfers between accounts.
 * Requires JWT authentication and idempotency key.
 * @module routes/transfer
 */

import { Router } from "express";

import { type TransferController } from "../controllers/transfer.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createTransferSchema } from "../schemas/transfer.schema.js";

function createTransferRoutes(
  transferController: TransferController,
  idempotencyMiddleware: ReturnType<typeof import("../middleware/idempotency.middleware.js").createIdempotencyMiddleware>
): Router {
  const router = Router();

  router.post(
    "/",
    authMiddleware,
    validate({ body: createTransferSchema }),
    idempotencyMiddleware,
    transferController.execute.bind(transferController)
  );

  return router;
}

export { createTransferRoutes };
