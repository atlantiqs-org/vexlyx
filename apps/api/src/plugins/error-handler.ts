import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyError,
} from "fastify";
import { ZodError } from "zod";

/** Consistent error response shape returned by all API errors */
interface ErrorResponse {
  error: string;
  code: string;
  details: Record<string, unknown>;
}

/**
 * Constructs a standardized error response object.
 * @param statusCode - HTTP status code
 * @param message - Human-readable error message
 * @param code - Machine-readable error code (e.g., "NOT_FOUND", "VALIDATION_ERROR")
 * @param details - Additional context about the error
 * @returns Object with statusCode and formatted body
 */
function buildErrorResponse(
  statusCode: number,
  message: string,
  code: string,
  details: Record<string, unknown> = {},
): { statusCode: number; body: ErrorResponse } {
  return {
    statusCode,
    body: { error: message, code, details },
  };
}

interface ZodIssueLike {
  path?: (string | number)[];
  message: string;
}

interface ZodErrorLike {
  name?: string;
  issues: ZodIssueLike[];
}

function isZodError(error: unknown): error is ZodErrorLike {
  if (!error || typeof error !== "object") return false;
  if (error instanceof ZodError) return true;
  const e = error as Record<string, unknown>;
  return (
    e.name === "ZodError" ||
    (Array.isArray(e.issues) && e.issues.length > 0 && typeof (e.issues[0] as Record<string, unknown>)?.message === "string")
  );
}

/**
 * Transforms a ZodError into a 400 response with per-field error messages.
 * Groups multiple issues by their field path for easy frontend consumption.
 * @param error - The ZodError from failed schema validation
 * @returns Formatted error response with field-level details
 */
function handleZodError(error: ZodErrorLike) {
  const fieldErrors: Record<string, string[]> = {};
  let firstMessage = "Validation failed";

  for (const issue of error.issues) {
    const path = issue.path && issue.path.length > 0 ? issue.path.join(".") : "_root";
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(issue.message);
    if (firstMessage === "Validation failed" && issue.message) {
      firstMessage = issue.message;
    }
  }

  return buildErrorResponse(400, firstMessage, "VALIDATION_ERROR", {
    fields: fieldErrors,
  });
}

/**
 * Fastify plugin that registers a global error handler and 404 handler.
 * Ensures all errors — Zod validation, Fastify schema, and uncaught —
 * are returned in the consistent shape: `{ error, code, details }`.
 *
 * Internal error details are never leaked to the client for 500 errors.
 * @param app - The Fastify instance to register the handlers on
 */
export async function errorHandlerPlugin(app: FastifyInstance) {
  app.setNotFoundHandler(
    (_request: FastifyRequest, reply: FastifyReply) => {
      const { statusCode, body } = buildErrorResponse(
        404,
        "Not Found",
        "NOT_FOUND",
      );
      reply.status(statusCode).send(body);
    },
  );

  app.setErrorHandler(
    (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
      if (isZodError(error)) {
        const { statusCode, body } = handleZodError(error);
        reply.status(statusCode).send(body);
        return;
      }

      // Fastify's built-in schema validation (JSON Schema / Ajv)
      if (error.validation) {
        const { statusCode, body } = buildErrorResponse(
          400,
          "Validation failed",
          "VALIDATION_ERROR",
          { validation: error.validation },
        );
        reply.status(statusCode).send(body);
        return;
      }

      const status = error.statusCode ?? 500;

      if (status >= 500) {
        app.log.error(error, "Unhandled server error");
      }

      // Never expose internal error messages to clients for 500s
      const { statusCode, body } = buildErrorResponse(
        status,
        status >= 500 ? "Internal Server Error" : error.message,
        status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
      );

      reply.status(statusCode).send(body);
    },
  );
}
