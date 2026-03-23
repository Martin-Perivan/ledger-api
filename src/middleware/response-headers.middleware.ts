/**
 * Sets required response headers: Cache-Control and X-Response-Time.
 * Financial data must never be cached.
 * @module middleware/response-headers
 */

import { Request, Response, NextFunction } from "express";

function responseHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = process.hrtime.bigint();

  res.setHeader("Cache-Control", "no-store");

  const originalWriteHead = res.writeHead.bind(res);
  res.writeHead = function (...args: Parameters<Response["writeHead"]>) {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    res.setHeader("X-Response-Time", `${durationMs.toFixed(0)}ms`);
    return originalWriteHead(...args);
  } as typeof res.writeHead;

  next();
}

export { responseHeadersMiddleware };
