/**
 * Account routes for creating, listing, retrieving, and history.
 * All routes require JWT authentication.
 * @module routes/account
 */

import { Router } from "express";

import { type AccountController } from "../controllers/account.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createAccountSchema,
  accountParamsSchema,
  accountHistoryQuerySchema,
} from "../schemas/account.schema.js";

function createAccountRoutes(accountController: AccountController): Router {
  const router = Router();

  router.post(
    "/",
    authMiddleware,
    validate({ body: createAccountSchema }),
    accountController.create.bind(accountController)
  );

  router.get(
    "/",
    authMiddleware,
    accountController.list.bind(accountController)
  );

  router.get(
    "/:accountId",
    authMiddleware,
    validate({ params: accountParamsSchema }),
    accountController.getById.bind(accountController)
  );

  router.get(
    "/:accountId/history",
    authMiddleware,
    validate({ params: accountParamsSchema, query: accountHistoryQuerySchema }),
    accountController.getHistory.bind(accountController)
  );

  return router;
}

export { createAccountRoutes };
