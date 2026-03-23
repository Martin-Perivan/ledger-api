/**
 * Express Request augmentation for JWT auth and request-level metadata.
 * @module types/express
 */

declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      email: string;
    };
    requestId?: string;
  }
}
