import type { Constructor } from './constructor.type';
import type { FieldMapping } from './field-mapping.interface';
import type { MappingOptions } from './mapping-options.interface';

/**
 * Mapping profile for reusable mapping definitions
 * @template TSource - Source object type
 * @template TTarget - Target object type
 */
export interface MappingProfile<TTarget = unknown> {
  /** Unique name identifier for the profile */
  name: string;
  /** Target class constructor */
  targetClass: Constructor<TTarget>;
  /** Field mappings array */
  mapping: FieldMapping[];
  /** Optional mapping options */
  options?: MappingOptions;
}
