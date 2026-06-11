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

type PathValue<T> = NonNullable<T>;

/**
 * Type-safe nested path type for deep property access
 * Generates union of all valid paths like 'user' | 'user.address' | 'user.address.city'
 */
export type ExcludeFieldsOf<T> = (unknown extends T ? string : NestedKeyOf<T>)[];

export type NestedKeyOf<T, D extends number = MaxDepth> = [D] extends [never]
  ? never
  : T extends Primitive
    ? never
    : T extends ReadonlyArray<infer U>
      ? NestedKeyOf<PathValue<U>, Prev[D]>
      : T extends object
        ? {
            [K in keyof T & string]: PathValue<T[K]> extends Primitive
              ? K
              : PathValue<T[K]> extends ReadonlyArray<infer U>
                ? PathValue<U> extends object
                  ? K | `${K}.${NestedKeyOf<PathValue<U>, Prev[D]>}`
                  : K
                : PathValue<T[K]> extends object
                  ? K | `${K}.${NestedKeyOf<PathValue<T[K]>, Prev[D]>}`
                  : K;
          }[keyof T & string]
        : never;
