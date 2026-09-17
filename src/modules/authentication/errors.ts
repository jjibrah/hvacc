export class AuthenticationRequiredError extends Error {
  readonly status = 401;

  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthorizationDeniedError extends Error {
  readonly status = 403;

  constructor() {
    super("You are not authorized to perform this action.");
    this.name = "AuthorizationDeniedError";
  }
}

export class ResourceNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("The requested resource was not found.");
    this.name = "ResourceNotFoundError";
  }
}

export function isAuthError(
  error: unknown,
): error is Error & { status: 401 | 403 | 404 } {
  return (
    error instanceof Error &&
    "status" in error &&
    (error.status === 401 || error.status === 403 || error.status === 404)
  );
}
