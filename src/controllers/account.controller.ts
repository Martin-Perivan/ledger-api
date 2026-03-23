/**
 * Account controller mapping account service results to HTTP responses.
 * Delegates all business logic to AccountService.
 * @module controllers/account
 */

import { Request, Response } from "express";

import { type AccountService } from "../services/account.service.js";
import { type CreateAccountInput, type AccountHistoryQuery } from "../schemas/account.schema.js";
import { sendSuccess, sendError } from "../utils/response.js";

class AccountController {
  constructor(private readonly accountService: AccountService) {}

  async create(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const input = req.body as CreateAccountInput;
    const result = await this.accountService.create(userId, input);

    if (!result.success) {
      sendError(res, result.error);
      return;
    }

    sendSuccess(res, result.data, 201);
  }

  async list(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const result = await this.accountService.listByUser(userId);

    if (!result.success) {
      sendError(res, result.error);
      return;
    }

    sendSuccess(res, result.data, 200);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const accountId = req.params["accountId"] as string;
    const result = await this.accountService.getById(accountId, userId);

    if (!result.success) {
      sendError(res, result.error);
      return;
    }

    sendSuccess(res, result.data, 200);
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const accountId = req.params["accountId"] as string;
    const { page, limit } = req.query as unknown as AccountHistoryQuery;
    const result = await this.accountService.getHistory(
      accountId,
      userId,
      page,
      limit
    );

    if (!result.success) {
      sendError(res, result.error);
      return;
    }

    sendSuccess(res, result.data, 200);
  }
}

export { AccountController };
