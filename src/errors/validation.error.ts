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
