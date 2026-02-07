/**
 * Mapping error with detailed information
 */
export class MappingError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly sourceValue: unknown,
    public readonly errors?: string[],
  ) {
    super(message);
    this.name = 'MappingError';
    Object.setPrototypeOf(this, MappingError.prototype);
  }
}
