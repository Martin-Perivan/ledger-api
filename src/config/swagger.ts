/**
 * Swagger/OpenAPI configuration using swagger-jsdoc.
 * Serves interactive API docs at /api-docs.
 * @module config/swagger
 */

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { type Express } from "express";

const swaggerDefinition: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Ledger API",
      version: "1.0.0",
      description:
        "Double-entry accounting engine for digital wallets with AI-powered fraud detection.",
      contact: {
        name: "Martin Perivan",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string", example: "Validation failed." },
                details: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    paths: {
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "fullName"],
                  properties: {
                    email: { type: "string", format: "email", example: "user@example.com" },
                    password: { type: "string", minLength: 8, example: "MinLength8!" },
                    fullName: { type: "string", example: "José Martín" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "User registered successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      data: {
                        type: "object",
                        properties: {
                          userId: { type: "string" },
                          email: { type: "string" },
                          fullName: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { description: "Validation error" },
            "409": { description: "Email already exists" },
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Authenticate and receive JWT",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      data: {
                        type: "object",
                        properties: {
                          accessToken: { type: "string" },
                          expiresIn: { type: "number", example: 3600 },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { description: "Invalid credentials" },
          },
        },
      },
      "/accounts": {
        post: {
          tags: ["Accounts"],
          summary: "Create a new account",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["currency"],
                  properties: {
                    currency: { type: "string", example: "MXN", minLength: 3, maxLength: 3 },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Account created" },
            "401": { description: "Unauthorized" },
          },
        },
        get: {
          tags: ["Accounts"],
          summary: "List all accounts for the authenticated user",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "List of accounts" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/accounts/{accountId}": {
        get: {
          tags: ["Accounts"],
          summary: "Get account details",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "accountId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Account details" },
            "403": { description: "Access denied" },
            "404": { description: "Account not found" },
          },
        },
      },
      "/accounts/{accountId}/history": {
        get: {
          tags: ["Accounts"],
          summary: "Get paginated ledger entries for an account",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "accountId", in: "path", required: true, schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          ],
          responses: {
            "200": { description: "Paginated ledger entries" },
            "403": { description: "Access denied" },
            "404": { description: "Account not found" },
          },
        },
      },
      "/deposits": {
        post: {
          tags: ["Deposits"],
          summary: "Deposit funds into an account",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["accountId", "amount", "currency", "description"],
                  properties: {
                    accountId: { type: "string" },
                    amount: { type: "integer", minimum: 1, example: 50000 },
                    currency: { type: "string", example: "MXN" },
                    description: { type: "string", example: "Initial funding" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Deposit completed" },
            "400": { description: "Validation error" },
            "404": { description: "Account not found" },
            "409": { description: "Duplicate idempotency key" },
          },
        },
      },
      "/transfers": {
        post: {
          tags: ["Transfers"],
          summary: "Execute a P2P transfer with AI fraud detection",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["fromAccountId", "toAccountId", "amount", "currency", "description"],
                  properties: {
                    fromAccountId: { type: "string" },
                    toAccountId: { type: "string" },
                    amount: { type: "integer", minimum: 100, example: 10000 },
                    currency: { type: "string", example: "MXN" },
                    description: { type: "string", example: "Payment for dinner" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Transfer completed" },
            "400": { description: "Validation error" },
            "403": { description: "Blocked by fraud detection" },
            "404": { description: "Account not found" },
            "409": { description: "Duplicate idempotency key" },
            "422": { description: "Insufficient funds / business rule violated" },
          },
        },
      },
    },
  },
  apis: [],
};

function setupSwagger(app: Express): void {
  const spec = swaggerJsdoc(swaggerDefinition);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
}

export { setupSwagger };
