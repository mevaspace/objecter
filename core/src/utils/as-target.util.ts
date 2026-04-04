import { Constructor } from '../types';

/**
 * Helper to use an interface or type as a target class for mapping.
 * It returns the global Object constructor casted as your specific type.
 */
export function asTarget<T>(): Constructor<T> {
  return Object as unknown as Constructor<T>;
}
