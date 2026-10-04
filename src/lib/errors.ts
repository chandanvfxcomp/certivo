// src/lib/errors.ts
//
// Typed error classes (spec Section 13.1). Every server action / route
// handler boundary catches these and maps them to a response — never a
// raw stack trace or internal message to the client (Section 12.1
// "Data leakage in errors": generic messages to the client, full detail
// to server logs only).
//
// `clientMessage` is what's safe to ever show a user. `message` (the
// standard Error field) can carry internal detail for logs and is never
// sent to the client directly — the request boundary is responsible for
// reading `clientMessage`/`status`, not `message`.

export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
  readonly clientMessage: string;

  constructor(message: string, clientMessage?: string) {
    super(message);
    this.name = this.constructor.name;
    this.clientMessage = clientMessage ?? "Something went wrong.";
  }
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = "UNAUTHORIZED";

  constructor(message = "Not authenticated") {
    super(message, "You need to sign in to do that.");
  }
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = "FORBIDDEN";

  constructor(message = "Not permitted") {
    super(message, "You don't have permission to do that.");
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "NOT_FOUND";

  constructor(message = "Not found") {
    super(message, "That couldn't be found.");
  }
}

export class ValidationError extends AppError {
  readonly status = 422;
  readonly code = "VALIDATION_ERROR";
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message = "Invalid input", fieldErrors?: Record<string, string[]>) {
    super(message, "Some of the information provided isn't valid.");
    this.fieldErrors = fieldErrors;
  }
}

export class LimitExceededError extends AppError {
  readonly status = 402;
  readonly code = "LIMIT_EXCEEDED";
  readonly metric: string;
  readonly current: number;
  readonly max: number;
  readonly planName?: string;

  constructor(metric: string, current: number, max: number, planName?: string) {
    super(
      `Limit exceeded for "${metric}": ${current}/${max}${planName ? ` on plan ${planName}` : ""}`,
      `You've reached your plan's limit for ${metric}.`,
    );
    this.metric = metric;
    this.current = current;
    this.max = max;
    this.planName = planName;
  }
}

/** True for any of the typed errors above — false for anything unexpected. */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/**
 * Maps any thrown value to a safe, client-facing shape. Call this at every
 * server action / route handler boundary — never let a raw Error (or its
 * stack) reach the client. Unrecognized errors collapse to a generic 500;
 * log the original `err` server-side before calling this.
 */
export function toClientError(err: unknown): {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
} {
  if (isAppError(err)) {
    return {
      status: err.status,
      code: err.code,
      message: err.clientMessage,
      ...(err instanceof ValidationError && err.fieldErrors
        ? { fieldErrors: err.fieldErrors }
        : {}),
    };
  }
  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again.",
  };
}
