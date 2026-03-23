/**
 * Assigns a unique request ID (UUID v4) to every incoming request.
 * Sets X-Request-Id response header and attaches ID to req for logging correlation.
 * @module middleware/request-id
 */

import { randomUUID } from "node:crypto";

import { Request, Response, NextFunction } from "express";

function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

export { requestIdMiddleware };
