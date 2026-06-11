import { ValidationError } from '../errors';
import { Constructor, MappingContext, MappingOptions } from '../types';
import { isPlainObject, deepClone, FORBIDDEN_KEYS } from '../utils';
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
  validationErrors: Map<string, string[]> | undefined;
  mappedTargetProps: Set<string> | undefined;
} {
  const target = targetClass === (Object as unknown) ? ({} as TTarget) : new targetClass();
  const context: MappingContext = { source, targetType: targetClass, data: options.context };

  return { target, context, validationErrors: undefined, mappedTargetProps: undefined };
}

/**
 * Limits for string-built exclude patterns to mitigate ReDoS via untrusted config
 */
const MAX_EXCLUDE_PATTERN_LENGTH = 1000;
/**
 * Heuristic for catastrophic backtracking: a quantified token immediately
 * before a closing group that is itself quantified, e.g. (a+)+, (a*){2,}, ((a)+)+
 */
const NESTED_QUANTIFIER_PATTERN = /[+*}]\)[+*{]/;

/**
 * Applies AutoMap logic to copy matching properties
 */
function buildExcludePattern(options: Required<MappingOptions>): RegExp | null {
  if (!options.excludePattern) return null;
  if (typeof options.excludePattern !== 'string') return options.excludePattern;

  if (options.excludePattern.length > MAX_EXCLUDE_PATTERN_LENGTH) {
    throw new Error(`excludePattern exceeds maximum length of ${MAX_EXCLUDE_PATTERN_LENGTH} characters`);
  }
  if (NESTED_QUANTIFIER_PATTERN.test(options.excludePattern)) {
    throw new Error(
      `excludePattern '${options.excludePattern}' contains nested quantifiers that can cause catastrophic backtracking; pass a precompiled RegExp instead if this pattern is intentional`,
    );
  }
  return new RegExp(options.excludePattern);
}

function isExcluded(key: string, excludeSet: Set<string> | null, excludeRe: RegExp | null): boolean {
  if (excludeSet?.has(key)) return true;
  if (excludeRe?.test(key)) return true;
  return false;
}

export function applyAutoMapping(
  source: unknown,
  target: Record<string, unknown>,
  targetClass: Constructor<unknown>,
  mappedTargetProps: Set<string> | undefined,
  options: Required<MappingOptions>,
): void {
  if (!options.autoMap || !isPlainObject(source)) {
    return;
  }

  const sourceObj = source;
  let targetKeys: Set<string>;
  if (targetClass === (Object as unknown)) {
    targetKeys = new Set(Object.keys(sourceObj as object));
  } else {
    targetKeys = new Set([...Object.getOwnPropertyNames(target), ...Object.getOwnPropertyNames(targetClass.prototype)]);
  }

  const excludeSet = options.excludeFields?.length ? new Set<string>(options.excludeFields as string[]) : null;
  const excludeRe = buildExcludePattern(options);

  for (const key of targetKeys) {
    // '__proto__' and 'prototype' must be skipped along with 'constructor':
    // with an Object target the key set comes from the source, and assigning
    // an own '__proto__' key would rewrite the target's prototype
    if (FORBIDDEN_KEYS.has(key)) {
      continue;
    }
    if (mappedTargetProps?.has(key)) {
      continue;
    }
    if (isExcluded(key, excludeSet, excludeRe)) {
      continue;
    }

    if (Object.hasOwn(sourceObj, key)) {
      const value = sourceObj[key];
      if (value === undefined && !options.copyUndefined) {
        continue;
      }
      target[key] = deepClone(value, options.checkCircular);
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
  mappedTargetProps: Set<string> | undefined,
  options: Required<MappingOptions>,
  validationErrors: Map<string, string[]> | undefined,
): void {
  applyAutoMapping(source, target as Record<string, unknown>, targetClass, mappedTargetProps, options);

  if (options.throwOnValidationError && validationErrors) {
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
