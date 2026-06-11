import type { Constructor } from './constructor.type';

/**
 * Mapping context passed to transforms and validators
 */
export interface MappingContext {
  /** Source object being converted */
  source: unknown;
  /** Target class/type being converted to */
  targetType: Constructor<unknown>;
  /** Additional user-provided context data */
  data?: Record<string, unknown>;
}
