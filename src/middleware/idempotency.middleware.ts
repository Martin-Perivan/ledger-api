/**
 * Idempotency middleware for state-changing financial operations.
 * Requires Idempotency-Key header (UUID v4). Returns cached response on duplicate.
 * Keys are scoped to the authenticated user to prevent cross-user response leakage.
 * @module middleware/idempotency
 */

import { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";

import { type IdempotencyRepository } from "../repositories/idempotency.repository.js";
import { logger } from "../utils/logger.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createIdempotencyMiddleware(idempotencyRepo: IdempotencyRepository) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const idempotencyKey = req.headers["idempotency-key"];

    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      res.status(400).json({
        success: false,
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "Idempotency-Key header is required (UUID v4).",
        },
      });
      return;
    }

    if (!UUID_V4_REGEX.test(idempotencyKey)) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_IDEMPOTENCY_KEY",
          message: "Idempotency-Key must be a valid UUID v4.",
        },
      });
      return;
    }

    try {
      const userId = new ObjectId(req.user!.userId);
      const existing = await idempotencyRepo.findByKeyAndUser(
        idempotencyKey,
        userId
      );

      if (existing) {
        logger.info(
          { idempotencyKey },
          "Duplicate request — returning cached response"
        );

        const cachedBody: unknown = JSON.parse(existing.responseBody);
        res.status(existing.statusCode).json(cachedBody);
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export { createIdempotencyMiddleware };
