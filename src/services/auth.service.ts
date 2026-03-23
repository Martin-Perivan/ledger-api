/**
 * Authentication service handling user registration and login.
 * Returns Result<T, E> — never throws from business logic.
 * @module services/auth
 */

import { type UserRepository } from "../repositories/user.repository.js";
import { type RegisterInput, type LoginInput } from "../schemas/auth.schema.js";
import {
  type Result,
  type AppError,
  success,
  failure,
} from "../utils/result.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { signToken } from "../utils/token.js";
import { env } from "../config/environment.js";
import { logger } from "../utils/logger.js";

interface RegisterOutput {
  userId: string;
  email: string;
  fullName: string;
}

interface LoginOutput {
  accessToken: string;
  expiresIn: number;
}

class AuthService {
  constructor(private readonly userRepo: UserRepository) {}

  async register(input: RegisterInput): Promise<Result<RegisterOutput, AppError>> {
    try {
      const existingUser = await this.userRepo.findByEmail(input.email);
      if (existingUser) {
        return failure({
          code: "EMAIL_ALREADY_EXISTS",
          message: "A user with this email already exists.",
          statusCode: 409,
        });
      }

      const passwordHash = await hashPassword(input.password);
      const now = new Date();

      const user = await this.userRepo.create({
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        createdAt: now,
        updatedAt: now,
      });

      logger.info({ userId: user._id.toHexString() }, "User registered");

      return success({
        userId: user._id.toHexString(),
        email: user.email,
        fullName: user.fullName,
      });
    } catch (error) {
      logger.error({ err: error }, "Registration failed");
      return failure({
        code: "REGISTRATION_FAILED",
        message: "An unexpected error occurred during registration.",
        statusCode: 500,
      });
    }
  }

  async login(input: LoginInput): Promise<Result<LoginOutput, AppError>> {
    try {
      const user = await this.userRepo.findByEmail(input.email);
      if (!user) {
        return failure({
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
          statusCode: 401,
        });
      }

      const isPasswordValid = await comparePassword(
        input.password,
        user.passwordHash
      );
      if (!isPasswordValid) {
        return failure({
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
          statusCode: 401,
        });
      }

      const accessToken = signToken({
        userId: user._id.toHexString(),
        email: user.email,
      });

      logger.info({ userId: user._id.toHexString() }, "User logged in");

      return success({
        accessToken,
        expiresIn: env.JWT_EXPIRES_IN,
      });
    } catch (error) {
      logger.error({ err: error }, "Login failed");
      return failure({
        code: "LOGIN_FAILED",
        message: "An unexpected error occurred during login.",
        statusCode: 500,
      });
    }
  }
}

export { AuthService };
export type { RegisterOutput, LoginOutput };
