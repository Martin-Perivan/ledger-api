/**
 * Deposit controller mapping deposit service results to HTTP responses.
 * Delegates all business logic to DepositService.
 * @module controllers/deposit
 */

import { Request, Response } from "express";

import { type DepositService } from "../services/deposit.service.js";
import { type CreateDepositInput } from "../schemas/deposit.schema.js";
import { sendSuccess, sendError } from "../utils/response.js";

class DepositController {
  constructor(private readonly depositService: DepositService) {}

  async execute(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const input = req.body as CreateDepositInput;
    const idempotencyKey = req.headers["idempotency-key"] as string;
    const ip = req.ip ?? "unknown";
    const userAgent = req.headers["user-agent"] ?? "unknown";

    const result = await this.depositService.execute(
      userId,
      input,
      idempotencyKey,
      ip,
      userAgent
    );

    if (!result.success) {
      sendError(res, result.error);
      return;
    }

    sendSuccess(res, result.data, 201);
  }
}

export { DepositController };
