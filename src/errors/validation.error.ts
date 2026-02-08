/**
 * Validation error containing all field validation failures
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Map<string, string[]>,
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Type guard for ValidationError
 * @param error - The error to check
 * @returns True if the error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
