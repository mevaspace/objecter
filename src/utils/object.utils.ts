/**
 * Type guard to check if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deep clones a value to prevent mutation of source objects
 * Fast path: primitives (string, number, boolean, symbol, bigint) don't need cloning
 */
export function deepClone<T>(value: T): T {
  // Fast path: null, undefined, and primitives don't need cloning
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  return structuredClone(value);
}
