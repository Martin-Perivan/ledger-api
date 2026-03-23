/**
 * Authentication routes for user registration and login.
 * No business logic — delegates to controller via middleware chain.
 * @module routes/auth
 */

import { Router } from "express";

import { type AuthController } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";

function createAuthRoutes(authController: AuthController): Router {
  const router = Router();

  router.post(
    "/register",
    validate({ body: registerSchema }),
    authController.register.bind(authController)
  );

  router.post(
    "/login",
    validate({ body: loginSchema }),
    authController.login.bind(authController)
  );

  return router;
}

export { createAuthRoutes };
