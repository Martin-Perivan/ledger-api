/**
 * Auth controller mapping authentication service results to HTTP responses.
 * Delegates all business logic to AuthService.
 * @module controllers/auth
 */

import { Request, Response } from "express";

import { type AuthService } from "../services/auth.service.js";
import { type RegisterInput, type LoginInput } from "../schemas/auth.schema.js";
import { sendSuccess, sendError } from "../utils/response.js";

class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(req: Request, res: Response): Promise<void> {
    const input = req.body as RegisterInput;
    const result = await this.authService.register(input);

    if (!result.success) {
      sendError(res, result.error);
      return;
    }

    sendSuccess(res, result.data, 201);
  }

  async login(req: Request, res: Response): Promise<void> {
    const input = req.body as LoginInput;
    const result = await this.authService.login(input);

    if (!result.success) {
      sendError(res, result.error);
      return;
    }

    sendSuccess(res, result.data, 200);
  }
}

export { AuthController };
