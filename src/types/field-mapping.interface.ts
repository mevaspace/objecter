import type { NestedKeyOf } from './property-path.type';
import type { TransformFn } from './transform-fn.type';
import type { Validator } from './validator.type';

/**
 * Single field mapping configuration
 * @template TSource - Source object type for type-safe 'from' paths
 * @template TTarget - Target object type for type-safe 'to' paths
 */
/**
 * Helper type to get property path - uses NestedKeyOf for known object types,
 * falls back to PropertyPath for unknown/any
 */
type PropertyPathOf<T> = unknown extends T ? string : T extends object ? NestedKeyOf<T> | string : string;

export interface FieldMapping<TSource = unknown, TTarget = unknown> {
  /** Source property path (supports nested paths like 'user.name') */
  from: PropertyPathOf<TSource>;
  /** Target property path (defaults to 'from' if not specified) */
  to?: PropertyPathOf<TTarget>;
  /** Transform function to convert the value */
  transform?: TransformFn;
  /** Default value if source is null/undefined */
  defaultValue?: TTarget;
  /** Whether this field is optional (won't throw if missing) */
  optional?: boolean;
  /** Validation function(s) for the field */
  validate?: Validator | Validator[];
  /** Whether to skip this field if source value is null/undefined */
  skipIfNull?: boolean;
}
