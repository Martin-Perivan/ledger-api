/**
 * Zod-based request validation middleware.
 * Validates body, params, and/or query against provided schemas.
 * @module middleware/validate
 */

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

function validate(schemas: ValidationSchemas | ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if ("parse" in schemas && typeof schemas.parse === "function") {
        req.body = (schemas as ZodSchema).parse(req.body);
      } else {
        const s = schemas as ValidationSchemas;
        if (s.body) {
          req.body = s.body.parse(req.body);
        }
        if (s.params) {
          req.params = s.params.parse(req.params) as Record<string, string>;
        }
        if (s.query) {
          req.query = s.query.parse(req.query) as Record<string, string>;
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed.",
            details,
          },
        });
        return;
      }
      next(error);
    }
  };
}

export { validate };
