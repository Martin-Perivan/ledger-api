/**
 * Transfer controller mapping transfer service results to HTTP responses.
 * Delegates all business logic to TransferService.
 * @module controllers/transfer
 */

import { Request, Response } from "express";

import { type TransferService } from "../services/transfer.service.js";
import { type CreateTransferInput } from "../schemas/transfer.schema.js";
import { sendSuccess, sendError } from "../utils/response.js";

class TransferController {
  constructor(private readonly transferService: TransferService) {}

  async execute(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const input = req.body as CreateTransferInput;
    const idempotencyKey = req.headers["idempotency-key"] as string;
    const ip = req.ip ?? "unknown";
    const userAgent = req.headers["user-agent"] ?? "unknown";

    const result = await this.transferService.execute(
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

export { TransferController };
