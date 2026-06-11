import { MappingOptions, SchemaValidateFn, AsyncSchemaValidateFn } from '../types';

/**
 * Default mapping options (immutable)
 */
export const DEFAULT_OPTIONS: Required<MappingOptions> = {
  throwOnValidationError: true,
  throwOnMissingFields: true,
  copyUndefined: false,
  context: {},
  strictMapping: true,
  autoMap: false,
  checkCircular: true,
  validateSchema: null as unknown as SchemaValidateFn,
  validateSchemaAsync: null as unknown as AsyncSchemaValidateFn,
  excludeFields: [],
  excludePattern: null as unknown as string | RegExp,
};

/**
 * Global options that override defaults
 */
let globalOptions: Partial<MappingOptions> = {};

/**
 * Configures global default options for all conversions
 * These options will be merged with DEFAULT_OPTIONS and can be overridden per-call
 *
 * @param options - Global options to set
 */
export function configure(options: Partial<MappingOptions>): void {
  globalOptions = { ...globalOptions, ...options };
}

/**
 * Resets global options to empty (uses only DEFAULT_OPTIONS)
 */
export function resetConfig(): void {
  globalOptions = {};
}

export function getMergedOptions(options?: MappingOptions): Required<MappingOptions> {
  return { ...DEFAULT_OPTIONS, ...globalOptions, ...options } as Required<MappingOptions>;
}
