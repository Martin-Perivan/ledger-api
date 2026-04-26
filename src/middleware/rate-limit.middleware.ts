/**
 * Rate limiting middleware with global and per-route configurations.
 * Uses express-rate-limit with in-memory store.
 *
 * NOTE: In-memory store is suitable for single-instance deployments only.
 * For multi-instance deployments, replace with a shared store (e.g. rate-limit-redis).
 * @module middleware/rate-limit
 */

import rateLimit from "express-rate-limit";

import { env } from "../config/environment.js";

const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
    },
  },
});

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please try again later.",
    },
  },
});

const transferLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? "unknown",
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many transfer requests. Please try again later.",
    },
  },
});

const depositLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? "unknown",
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many deposit requests. Please try again later.",
    },
  },
});

const accountCreationLimiter = rateLimit({
  windowMs: 3_600_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? "unknown",
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many account creation requests. Please try again later.",
    },
  },
});

export {
  globalLimiter,
  authLimiter,
  transferLimiter,
  depositLimiter,
  accountCreationLimiter,
};
