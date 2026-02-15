import type { MappingContext } from './mapping-context.interface';
import type { ValidationResult } from './validation-result.interface';

/**
 * Schema validation predicate function
 * Validates the entire target object after all field mappings are applied
 * @param target - The mapped target object
 * @param source - The original source object
 * @param context - Mapping context
 * @returns Validation result indicating success or failure with error messages
 */
export type SchemaValidateFn = (target: unknown, source: unknown, context: MappingContext) => ValidationResult;

/**
 * Async schema validation function
 * Validates the entire target object after all field mappings are applied (async version)
 * @param target - The mapped target object
 * @param source - The original source object
 * @param context - Mapping context
 * @returns Promise of validation result
 */
export type AsyncSchemaValidateFn = (
  target: unknown,
  source: unknown,
  context: MappingContext,
) => Promise<ValidationResult>;

/**
 * Mapping configuration options
 */
export interface MappingOptions {
  /** Whether to throw on validation errors (default: true) */
  throwOnValidationError?: boolean;
  /** Whether to throw on missing required fields (default: true) */
  throwOnMissingFields?: boolean;
  /** Whether to copy undefined properties (default: false) */
  copyUndefined?: boolean;
  /** Additional context data passed to transforms/validators */
  context?: Record<string, unknown>;
  /** Whether to strip properties not in mapping (default: true) */
  strictMapping?: boolean;
  /**
   * Whether to automatically map properties with matching names (default: false)
   * When enabled, properties present in both source and target will be copied automatically
   */
  autoMap?: boolean;
  /**
   * Whether to check for circular dependencies during deep cloning (default: true)
   * Disabling this improves performance but risks stack overflow if circular references exist
   */
  checkCircular?: boolean;
  /**
   * Schema-level validation function executed after all field mappings
   * Useful for validating business rules that depend on multiple fields
   */
  validateSchema?: SchemaValidateFn;
  /**
   * Async schema-level validation function (only runs in async methods)
   * Useful for validations that require async operations like database lookups
   */
  validateSchemaAsync?: AsyncSchemaValidateFn;
}
