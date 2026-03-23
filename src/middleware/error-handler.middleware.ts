/**
 * Global error handler — safety net for uncaught exceptions.
 * Logs the full error internally and returns a generic 500 to the client.
 * @module middleware/error-handler
 */

import { Request, Response, NextFunction } from "express";

import { logger } from "../utils/logger.js";

function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({ err }, "Unhandled error");

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
    },
  });
}

export { errorHandler };
