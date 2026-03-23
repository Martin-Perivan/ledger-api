/**
 * Password hashing utilities using bcrypt.
 * Salt rounds set to 12 as required by security policy.
 * @module utils/hash
 */

import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export { hashPassword, comparePassword };
