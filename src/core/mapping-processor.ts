import { MappingError, ValidationError } from '../errors';
import { FieldMapping, MappingContext, MappingOptions } from '../types';
import { getNestedValue, setNestedValue, normalizeValidator, normalizeAsyncValidator, deepClone } from '../utils';

/**
 * Handles missing or null values with defaultValue and optional logic
 */
function handleMissingValue(
  value: unknown,
  fieldMap: FieldMapping,
  options: Required<MappingOptions>,
  source: unknown,
  context: MappingContext,
): { shouldSkip: boolean; processedValue: unknown } {
  // Check skipIf predicate first (most flexible)
  if (fieldMap.skipIf?.(value, source, context)) {
    return { shouldSkip: true, processedValue: undefined };
  }

  if (value !== null && value !== undefined) {
    return { shouldSkip: false, processedValue: value };
  }

  // Backward compatibility: skipIfNull is shorthand for skipIf((v) => v === null || v === undefined)
  if (fieldMap.skipIfNull) {
    return { shouldSkip: true, processedValue: undefined };
  }

  if (fieldMap.defaultValue !== undefined) {
    return { shouldSkip: false, processedValue: deepClone(fieldMap.defaultValue) };
  }

  if (!fieldMap.optional && options.throwOnMissingFields) {
    throw new Error(`Required field '${fieldMap.from}' is missing or null`);
  }

  if (!options.copyUndefined) {
    return { shouldSkip: true, processedValue: undefined };
  }

  return { shouldSkip: false, processedValue: value };
}

/**
 * Appends validation error messages to the error map for a given field
 */
function accumulateErrors(targetField: string, errors: string[], validationErrors: Map<string, string[]>): void {
  let fieldErrors = validationErrors.get(targetField);
  if (!fieldErrors) {
    fieldErrors = [];
    validationErrors.set(targetField, fieldErrors);
  }
  for (const err of errors) {
    fieldErrors.push(err);
  }
}

/**
 * Runs validators on a value and accumulates errors
 */
function runValidators(
  value: unknown,
  fieldMap: FieldMapping,
  context: MappingContext,
  validationErrors: Map<string, string[]>,
): void {
  if (!fieldMap.validate || value === undefined) {
    return;
  }

  const validators = Array.isArray(fieldMap.validate) ? fieldMap.validate : [fieldMap.validate];
  const targetField = fieldMap.to || fieldMap.from;

  for (const validator of validators) {
    const normalizedValidator = normalizeValidator(validator);
    const result = normalizedValidator(value, fieldMap.from, context);
    if (!result.valid && result.errors) {
      accumulateErrors(targetField, result.errors, validationErrors);
    }
  }
}

/**
 * Runs validators asynchronously on a value and accumulates errors
 */
async function runValidatorsAsync(
  value: unknown,
  fieldMap: FieldMapping,
  context: MappingContext,
  validationErrors: Map<string, string[]>,
): Promise<void> {
  if (value === undefined) {
    return;
  }

  if (fieldMap.validate) {
    runValidators(value, fieldMap, context, validationErrors);
  }

  if (!fieldMap.validateAsync) {
    return;
  }

  const validators = Array.isArray(fieldMap.validateAsync) ? fieldMap.validateAsync : [fieldMap.validateAsync];
  const targetField = fieldMap.to || fieldMap.from;

  for (const validator of validators) {
    const result = await normalizeAsyncValidator(validator, value, fieldMap.from, context);
    if (!result.valid && result.errors) {
      accumulateErrors(targetField, result.errors, validationErrors);
    }
  }
}

/**
 * Processes a single field mapping
 */
export function processFieldMapping(
  source: unknown,
  target: Record<string, unknown>,
  fieldMap: FieldMapping,
  context: MappingContext,
  options: Required<MappingOptions>,
  validationErrors: Map<string, string[]>,
): void {
  const { from, to = from, transform } = fieldMap;

  let value = getNestedValue(source, from);

  const { shouldSkip, processedValue } = handleMissingValue(value, fieldMap, options, source, context);
  if (shouldSkip) return;

  value = processedValue;

  if (transform && value !== undefined) {
    value = transform(value, source, context);
  }

  runValidators(value, fieldMap, context, validationErrors);

  if (options.strictMapping && !(to in target)) {
    throw new MappingError(`Strict mapping failed: Property '${to}' does not exist in target type`, to, value);
  }

  setNestedValue(target, to, value);
}

/**
 * Processes a single field mapping with async transform support
 */
export async function processFieldMappingAsync(
  source: unknown,
  target: Record<string, unknown>,
  fieldMap: FieldMapping,
  context: MappingContext,
  options: Required<MappingOptions>,
  validationErrors: Map<string, string[]>,
): Promise<void> {
  const { from, to = from, transform } = fieldMap;

  let value = getNestedValue(source, from);

  const { shouldSkip, processedValue } = handleMissingValue(value, fieldMap, options, source, context);
  if (shouldSkip) return;

  value = processedValue;

  if (transform && value !== undefined) {
    const result = transform(value, source, context);
    value = result instanceof Promise ? await result : result;
  }

  await runValidatorsAsync(value, fieldMap, context, validationErrors);

  if (options.strictMapping && !(to in target)) {
    throw new MappingError(`Strict mapping failed: Property '${to}' does not exist in target type`, to, value);
  }

  setNestedValue(target, to, value);
}

/**
 * Wraps errors from field mapping with proper context
 */
export function wrapMappingError(error: unknown, fieldMap: FieldMapping, source: unknown): never {
  if (error instanceof MappingError) {
    const newField = `${fieldMap.from}.${error.field}`;
    throw new MappingError(error.message.replace(error.field, newField), newField, error.sourceValue, error.errors);
  }
  if (error instanceof ValidationError) {
    throw error;
  }

  throw new MappingError(
    `Error mapping field '${fieldMap.from}': ${(error as Error).message}`,
    fieldMap.from,
    getNestedValue(source, fieldMap.from),
  );
}
