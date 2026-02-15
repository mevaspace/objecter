import { ValidationError } from '../errors';
import { Constructor, MappingContext, MappingOptions } from '../types';
import { isPlainObject, deepClone } from '../utils';
import { DEFAULT_OPTIONS } from './config-manager';

/**
 * Initializes the conversion context and variables
 */
export function initializeConversion<TSource, TTarget>(
  source: TSource,
  targetClass: Constructor<TTarget>,
  options: Required<MappingOptions>,
): {
  target: TTarget;
  context: MappingContext;
  validationErrors: Map<string, string[]>;
  mappedTargetProps: Set<string>;
} {
  const target = new targetClass();
  const context: MappingContext = { source, targetType: targetClass, data: options.context };
  const validationErrors = new Map<string, string[]>();
  const mappedTargetProps = new Set<string>();

  return { target, context, validationErrors, mappedTargetProps };
}

/**
 * Applies AutoMap logic to copy matching properties
 */
export function applyAutoMapping(
  source: unknown,
  target: Record<string, unknown>,
  targetClass: Constructor<unknown>,
  mappedTargetProps: Set<string>,
  options: Required<MappingOptions>,
): void {
  if (!options.autoMap || !isPlainObject(source)) {
    return;
  }

  const sourceObj = source;
  const targetKeys = new Set([
    ...Object.getOwnPropertyNames(target),
    ...Object.getOwnPropertyNames(targetClass.prototype),
  ]);

  for (const key of targetKeys) {
    if (key === 'constructor') {
      continue;
    }
    if (mappedTargetProps.has(key)) {
      continue;
    }

    if (Object.hasOwn(sourceObj, key)) {
      const value = sourceObj[key];
      if (value === undefined && !options.copyUndefined) {
        continue;
      }
      target[key] = deepClone(value);
    }
  }
}

/**
 * Throws validation errors if any accumulated
 */
export function throwValidationErrors(validationErrors: Map<string, string[]>): void {
  if (validationErrors.size === 0) return;

  const errorMessages = Array.from(validationErrors.entries())
    .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
    .join('; ');
  throw new ValidationError(`Validation failed: ${errorMessages}`, validationErrors);
}

/**
 * Finalizes the conversion by applying auto-mapping and throwing collected validation errors
 */
export function finalizeConversion<TTarget>(
  source: unknown,
  target: TTarget,
  targetClass: Constructor<unknown>,
  mappedTargetProps: Set<string>,
  options: Required<MappingOptions>,
  validationErrors: Map<string, string[]>,
): void {
  applyAutoMapping(source, target as Record<string, unknown>, targetClass, mappedTargetProps, options);

  if (options.throwOnValidationError) {
    throwValidationErrors(validationErrors);
  }
}

/**
 * Processes schema validation result and throws error if needed
 */
export function processSchemaValidationResult(
  result: { valid: boolean; errors?: string[] },
  throwOnError: boolean,
): void {
  if (!result.valid && result.errors && throwOnError) {
    throw new ValidationError(
      `Schema validation failed: ${result.errors.join(', ')}`,
      new Map([['_schema', result.errors]]),
    );
  }
}

/**
 * Prepares runtime options by merging with context
 */
export function prepareRuntimeOptions(
  baseOptions: MappingOptions | undefined,
  context: MappingContext | undefined,
  defaultOptions: Required<MappingOptions> = DEFAULT_OPTIONS,
  globalOptions: Partial<MappingOptions> = {},
): Required<MappingOptions> {
  const merged = { ...defaultOptions, ...globalOptions, ...baseOptions };

  // If context is provided at runtime (e.g. via mapper(source, parent, context))
  // merge it with the options context
  if (context?.data) {
    merged.context = { ...merged.context, ...context.data };
  }

  return merged;
}
