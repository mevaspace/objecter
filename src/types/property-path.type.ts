/**
 * Maximum recursion depth for nested path generation
 * Prevents infinite recursion on circular types
 */
type MaxDepth = 5;

/**
 * Decrement depth counter using tuple length
 */
type Prev = [never, 0, 1, 2, 3, 4];

/**
 * Primitive types that should not be recursed into
 */
type Primitive = string | number | boolean | bigint | symbol | null | undefined;

/**
 * Type-safe nested path type for deep property access
 * Generates union of all valid paths like 'user' | 'user.address' | 'user.address.city'
 */
export type NestedKeyOf<T, D extends number = MaxDepth> = [D] extends [never]
  ? never
  : T extends Primitive
    ? never
    : T extends Array<infer U>
      ? NestedKeyOf<U, Prev[D]>
      : T extends object
        ? {
            [K in keyof T & string]: T[K] extends Primitive
              ? K
              : T[K] extends Array<infer U>
                ? U extends object
                  ? K | `${K}.${NestedKeyOf<U, Prev[D]>}`
                  : K
                : T[K] extends object
                  ? K | `${K}.${NestedKeyOf<T[K], Prev[D]>}`
                  : K;
          }[keyof T & string]
        : never;
