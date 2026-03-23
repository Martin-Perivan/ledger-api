/**
 * JWT sign and verify helpers using HS256.
 * Token payload contains userId, email, iat, and exp claims.
 * @module utils/token
 */

import jwt from "jsonwebtoken";

import { env } from "../config/environment.js";

interface TokenPayload {
  userId: string;
  email: string;
}

function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
  });

  return decoded as TokenPayload;
}

export { signToken, verifyToken };
export type { TokenPayload };
