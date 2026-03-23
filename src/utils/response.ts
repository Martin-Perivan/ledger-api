/**
 * HTTP response helpers for controllers.
 * Enforces the standard response envelope on all API responses.
 * @module utils/response
 */

import { Response } from "express";

import { type AppError } from "./result.js";

function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

function sendError(res: Response, error: AppError): void {
  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    },
  });
}

function sendPaginated<T>(
  res: Response,
  items: T[],
  pagination: { page: number; limit: number; totalItems: number }
): void {
  res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        ...pagination,
        totalPages: Math.ceil(pagination.totalItems / pagination.limit),
      },
    },
  });
}

export { sendSuccess, sendError, sendPaginated };
