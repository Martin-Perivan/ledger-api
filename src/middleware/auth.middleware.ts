/**
 * JWT verification middleware.
 * Extracts Bearer token from Authorization header, verifies it,
 * and attaches the decoded payload to req.user.
 * @module middleware/auth
 */

import { Request, Response, NextFunction } from "express";

import { verifyToken } from "../utils/token.js";
import { logger } from "../utils/logger.js";

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: {
        code: "MISSING_TOKEN",
        message: "Authorization header with Bearer token is required.",
      },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch (error) {
    logger.warn({ err: error }, "Invalid JWT token");
    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "The provided token is invalid or expired.",
      },
    });
  }
}

export { authMiddleware };
