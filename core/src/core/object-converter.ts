import { MappingError } from '../errors';
import { Constructor, FieldMapping, MappingContext, MappingOptions } from '../types';
import { deepClone } from '../utils';
import { DEFAULT_OPTIONS } from './config-manager';
import {
  initializeConversion,
  finalizeConversion,
  processSchemaValidationResult,
  prepareRuntimeOptions,
} from './conversion-helpers';
import { processFieldMapping, processFieldMappingAsync, wrapMappingError } from './mapping-processor';
import { validateMappingConfig } from './profile-registry';

const PLAIN_OBJECT_OPTIONS: Required<MappingOptions> = { ...DEFAULT_OPTIONS, strictMapping: false };

/**
 * Converts a source object to a target class instance using the provided mapping
 */
export function convert<TSource, TTarget>(
  source: TSource,
  targetClass: Constructor<TTarget>,
  mapping: FieldMapping[],
  options: Required<MappingOptions>,
): TTarget {
  if (source === null || source === undefined) {
    throw new MappingError('Source object cannot be null or undefined', 'source', source);
  }

  const { target, context, validationErrors, mappedTargetProps } = initializeConversion(source, targetClass, options);

  for (const fieldMap of mapping) {
    mappedTargetProps.add(fieldMap.to || fieldMap.from);
    try {
      processFieldMapping(source, target as Record<string, unknown>, fieldMap, context, options, validationErrors);
    } catch (error) {
      wrapMappingError(error, fieldMap, source);
    }
  }

  finalizeConversion(source, target, targetClass, mappedTargetProps, options, validationErrors);

  // Run schema-level validation if provided
  if (options.validateSchema) {
    processSchemaValidationResult(options.validateSchema(target, source, context), options.throwOnValidationError);
  }

  return target;
}

/**
 * Converts a source object to a target class instance with async transform support
 */
export async function convertAsync<TSource, TTarget>(
  source: TSource,
  targetClass: Constructor<TTarget>,
  mapping: FieldMapping[],
  options: Required<MappingOptions>,
): Promise<TTarget> {
  if (source === null || source === undefined) {
    throw new MappingError('Source object cannot be null or undefined', 'source', source);
  }

  const { target, context, validationErrors, mappedTargetProps } = initializeConversion(source, targetClass, options);

  for (const fieldMap of mapping) {
    mappedTargetProps.add(fieldMap.to || fieldMap.from);
    try {
      await processFieldMappingAsync(
        source,
        target as Record<string, unknown>,
        fieldMap,
        context,
        options,
        validationErrors,
      );
    } catch (error) {
      wrapMappingError(error, fieldMap, source);
    }
  }

  finalizeConversion(source, target, targetClass, mappedTargetProps, options, validationErrors);

  if (options.validateSchema) {
    processSchemaValidationResult(options.validateSchema(target, source, context), options.throwOnValidationError);
  }

  if (options.validateSchemaAsync) {
    processSchemaValidationResult(
      await options.validateSchemaAsync(target, source, context),
      options.throwOnValidationError,
    );
  }

  return target;
}

/**
 * Converts an array of source objects to target class instances
 */
export function convertArray<TSource, TTarget>(
  sources: TSource[],
  targetClass: Constructor<TTarget>,
  mapping: FieldMapping[],
  options: Required<MappingOptions>,
): TTarget[] {
  if (!Array.isArray(sources)) {
    throw new MappingError('Source must be an array', 'sources', sources);
  }

  return sources.map((source, index) => {
    try {
      return convert(source, targetClass, mapping, options);
    } catch (error) {
      if (error instanceof MappingError) {
        throw new MappingError(
          `Error at index ${index}: ${error.message}`,
          `[${index}].${error.field}`,
          error.sourceValue,
          error.errors,
        );
      }
      throw error;
    }
  });
}

/**
 * Converts an array of source objects to target class instances with async transform support
 */
export async function convertArrayAsync<TSource, TTarget>(
  sources: TSource[],
  targetClass: Constructor<TTarget>,
  mapping: FieldMapping[],
  options: Required<MappingOptions>,
): Promise<TTarget[]> {
  if (!Array.isArray(sources)) {
    throw new MappingError('Source must be an array', 'sources', sources);
  }

  const results: TTarget[] = [];
  for (let index = 0; index < sources.length; index++) {
    const source = sources[index];
    try {
      const result = await convertAsync(source, targetClass, mapping, options);
      results.push(result);
    } catch (error) {
      if (error instanceof MappingError) {
        throw new MappingError(
          `Error at index ${index}: ${error.message}`,
          `[${index}].${error.field}`,
          error.sourceValue,
          error.errors,
        );
      }
      throw error;
    }
  }
  return results;
}

/**
 * Converts an array of source objects to target class instances using a generator
 */
export function* convertArrayGenerator<TSource, TTarget>(
  sources: TSource[],
  targetClass: Constructor<TTarget>,
  mapping: FieldMapping[],
  options: Required<MappingOptions>,
): Generator<TTarget> {
  if (!Array.isArray(sources)) {
    throw new MappingError('Source must be an array', 'sources', sources);
  }

  for (let index = 0; index < sources.length; index++) {
    const source = sources[index];
    try {
      yield convert(source, targetClass, mapping, options);
    } catch (error) {
      if (error instanceof MappingError) {
        throw new MappingError(
          `Error at index ${index}: ${error.message}`,
          `[${index}].${error.field}`,
          error.sourceValue,
          error.errors,
        );
      }
      throw error;
    }
  }
}

/**
 * Creates a mapper function that can be reused for multiple conversions
 */
export function createMapper<TSource, TTarget>(
  targetClass: Constructor<TTarget>,
  mapping: FieldMapping[],
  baseOptions?: MappingOptions,
): (source: TSource, _parent?: unknown, context?: MappingContext) => TTarget {
  validateMappingConfig(mapping);

  return (source: TSource, _parent?: unknown, context?: MappingContext) => {
    const runtimeOptions = prepareRuntimeOptions(baseOptions, context);
    return convert(source, targetClass, mapping, runtimeOptions);
  };
}

/**
 * Creates an array mapper function that can be reused
 */
export function createArrayMapper<TSource, TTarget>(
  targetClass: Constructor<TTarget>,
  mapping: FieldMapping[],
  baseOptions?: MappingOptions,
): (sources: TSource[], _parent?: unknown, context?: MappingContext) => TTarget[] {
  validateMappingConfig(mapping);

  return (sources: TSource[], _parent?: unknown, context?: MappingContext) => {
    const runtimeOptions = prepareRuntimeOptions(baseOptions, context);
    return convertArray(sources, targetClass, mapping, runtimeOptions);
  };
}

/**
 * Merges multiple objects into a target class instance
 */
export function merge<TTarget>(
  sources: unknown[],
  targetClass: Constructor<TTarget>,
  mapping: FieldMapping[],
  options: Required<MappingOptions>,
): TTarget {
  const mergedSource: Record<string, unknown> = {};

  for (const source of sources) {
    if (source && typeof source === 'object') {
      Object.assign(mergedSource, deepClone(source));
    }
  }

  return convert(mergedSource, targetClass, mapping, options);
}

/**
 * Converts object to a plain object (strips class prototype)
 */
export function toPlainObject<TSource>(source: TSource, mapping?: FieldMapping[]): Record<string, unknown> {
  if (source === null || source === undefined) {
    throw new MappingError('Source object cannot be null or undefined', 'source', source);
  }

  if (!mapping) {
    return { ...(source as object) } as Record<string, unknown>;
  }

  const result: Record<string, unknown> = {};
  const context: MappingContext = { source, targetType: Object as unknown as Constructor<unknown>, data: {} };
  const validationErrors = new Map<string, string[]>();

  for (const fieldMap of mapping) {
    try {
      processFieldMapping(source, result, fieldMap, context, PLAIN_OBJECT_OPTIONS, validationErrors);
    } catch (error) {
      wrapMappingError(error, fieldMap, source);
    }
  }

  return result;
}
