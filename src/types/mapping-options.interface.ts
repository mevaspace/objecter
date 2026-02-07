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
}
