/**
 * Constructor type for class instantiation
 */
export type Constructor<T> = new (...args: unknown[]) => T;
