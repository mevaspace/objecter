import { MappingError, ValidationError } from './errors';
import { MappingOptions, Constructor, FieldMapping, MappingContext, SchemaValidateFn, MappingProfile } from './types';
import { getNestedValue, isPlainObject, deepClone, setNestedValue, normalizeValidator } from './utils';

/**
 * Objecter - A lightweight object mapping library for TypeScript
 * Similar to MapStruct (Java) but without decorators
 */

/**
 * Objecter - Main class for object mapping and transformation
 *
 * @example
 * ```typescript
 * class User {
 *   id: number;
 *   name: string;
 *   email: string;
 *   internalCode: string;
 * }
 *
 * class UserDto {
 *   id: number;
 *   name: string;
 *   email: string;
 * }
 *
 * const mapping = [
 *   { from: 'id', to: 'id' },
 *   { from: 'name', to: 'name', transform: (v) => v.toUpperCase() },
 *   { from: 'email', to: 'email' },
 * ];
 *
 * const userDto = Objecter.convert(user, UserDto, mapping);
 * ```
 */
export class Objecter {
  /**
   * Default mapping options (immutable)
   */
  private static readonly DEFAULT_OPTIONS: Required<MappingOptions> = {
    throwOnValidationError: true,
    throwOnMissingFields: true,
    copyUndefined: false,
    context: {},
    strictMapping: true,
    autoMap: false,
    validateSchema: null as unknown as SchemaValidateFn,
  };

  /**
   * Global options that override defaults
   */
  private static globalOptions: Partial<MappingOptions> = {};

  /**
   * Profile registry for reusable mapping definitions
   */
  private static readonly profiles = new Map<string, MappingProfile>();

  /**
   * Configures global default options for all conversions
   * These options will be merged with DEFAULT_OPTIONS and can be overridden per-call
   *
   * @param options - Global options to set
   */
  public static configure(options: Partial<MappingOptions>): void {
    this.globalOptions = { ...this.globalOptions, ...options };
  }

  /**
   * Resets global options to empty (uses only DEFAULT_OPTIONS)
   */
  public static resetConfig(): void {
    this.globalOptions = {};
  }

  /**
   * Registers a mapping profile for reuse
   *
   * @param profile - Mapping profile definition
   * @returns The registered profile (for chaining or type-safe name usage)
   * @throws {MappingError} When profile name is empty
   */
  public static registerProfile<TTarget = unknown>(profile: MappingProfile<TTarget>): MappingProfile<TTarget> {
    if (!profile.name || typeof profile.name !== 'string' || profile.name.trim() === '') {
      throw new MappingError('Profile name must be a non-empty string', 'profileName', profile.name);
    }
    this.validateMappingConfig(profile.mapping);
    this.profiles.set(profile.name, profile as MappingProfile);
    return profile;
  }

  /**
   * Clears all registered profiles
   */
  public static clearProfiles(): void {
    this.profiles.clear();
  }

  /**
   * Maps a source object using a registered profile
   *
   * @param source - Source object to map
   * @param profileName - Name of the registered profile
   * @param options - Optional override options (merged with profile and global options)
   * @returns Mapped target object
   * @throws {MappingError} When profile is not found
   */
  public static map<TTarget>(source: unknown, profileName: string, options?: MappingOptions): TTarget {
    const profile = this.profiles.get(profileName);
    if (!profile) {
      throw new MappingError(`Profile '${profileName}' not found`, 'profileName', profileName);
    }
    const mergedOptions = { ...profile.options, ...options };
    return this.convert(source, profile.targetClass, profile.mapping, mergedOptions) as TTarget;
  }

  /**
   * Converts a source object to a target class instance using the provided mapping
   *
   * @param source - Source object to convert
   * @param targetClass - Target class constructor
   * @param mapping - Array of field mappings
   * @param options - Optional mapping configuration
   * @returns New instance of targetClass with mapped values
   * @throws {MappingError} When a required field is missing
   * @throws {ValidationError} When validation fails
   */
  public static convert<TSource, TTarget>(
    source: TSource,
    targetClass: Constructor<TTarget>,
    mapping: FieldMapping[],
    options?: MappingOptions,
  ): TTarget {
    if (source === null || source === undefined) {
      throw new MappingError('Source object cannot be null or undefined', 'source', source);
    }

    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...this.globalOptions, ...options };
    const target = new targetClass();
    const context: MappingContext = { source, targetType: targetClass, data: mergedOptions.context };

    const validationErrors = new Map<string, string[]>();
    const mappedTargetProps = new Set<string>();

    for (const fieldMap of mapping) {
      mappedTargetProps.add(fieldMap.to || fieldMap.from);
      try {
        this.processFieldMapping(
          source,
          target as Record<string, unknown>,
          fieldMap,
          context,
          mergedOptions,
          validationErrors,
        );
      } catch (error) {
        this.wrapMappingError(error, fieldMap, source);
      }
    }

    this.applyAutoMapping(source, target as Record<string, unknown>, targetClass, mappedTargetProps, mergedOptions);

    if (mergedOptions.throwOnValidationError) {
      this.throwValidationErrors(validationErrors);
    }

    // Run schema-level validation if provided
    if (mergedOptions.validateSchema) {
      const schemaResult = mergedOptions.validateSchema(target, source, context);
      if (!schemaResult.valid && schemaResult.errors) {
        if (mergedOptions.throwOnValidationError) {
          throw new ValidationError(
            `Schema validation failed: ${schemaResult.errors.join(', ')}`,
            new Map([['_schema', schemaResult.errors]]),
          );
        }
      }
    }

    return target;
  } /* istanbul ignore next */

  /**
   * Converts an array of source objects to target class instances
   *
   * @param sources - Array of source objects
   * @param targetClass - Target class constructor
   * @param mapping - Array of field mappings
   * @param options - Optional mapping configuration
   * @returns Array of target class instances
   */
  public static convertArray<TSource, TTarget>(
    sources: TSource[],
    targetClass: Constructor<TTarget>,
    mapping: FieldMapping[],
    options?: MappingOptions,
  ): TTarget[] {
    if (!Array.isArray(sources)) {
      throw new MappingError('Source must be an array', 'sources', sources);
    }

    return sources.map((source, index) => {
      try {
        return this.convert(source, targetClass, mapping, options);
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
   * Converts an array of source objects to target class instances using a generator
   * Useful for processing large arrays without holding all results in memory
   *
   * @param sources - Array of source objects
   * @param targetClass - Target class constructor
   * @param mapping - Array of field mappings
   * @param options - Optional mapping configuration
   * @yields Target class instance
   */
  public static *convertArrayGenerator<TSource, TTarget>(
    sources: TSource[],
    targetClass: Constructor<TTarget>,
    mapping: FieldMapping[],
    options?: MappingOptions,
  ): Generator<TTarget> {
    if (!Array.isArray(sources)) {
      throw new MappingError('Source must be an array', 'sources', sources);
    }

    for (let index = 0; index < sources.length; index++) {
      const source = sources[index];
      try {
        yield this.convert(source, targetClass, mapping, options);
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
   *
   * @param targetClass - Target class constructor
   * @param mapping - Array of field mappings
   * @param options - Optional mapping configuration
   * @returns Reusable mapper function
   */
  public static createMapper<TSource, TTarget>(
    targetClass: Constructor<TTarget>,
    mapping: FieldMapping[],
    options?: MappingOptions,
  ): (source: TSource, _parent?: unknown, context?: MappingContext) => TTarget {
    // Validate mapping configuration at creation time for early error detection
    this.validateMappingConfig(mapping);

    return (source: TSource, _parent?: unknown, context?: MappingContext) => {
      const runtimeOptions = this.prepareRuntimeOptions(options, context);
      return this.convert(source, targetClass, mapping, runtimeOptions);
    };
  }

  /**
   * Creates an array mapper function that can be reused
   *
   * @param targetClass - Target class constructor
   * @param mapping - Array of field mappings
   * @param options - Optional mapping configuration
   * @returns Reusable array mapper function
   */
  public static createArrayMapper<TSource, TTarget>(
    targetClass: Constructor<TTarget>,
    mapping: FieldMapping[],
    options?: MappingOptions,
  ): (sources: TSource[], _parent?: unknown, context?: MappingContext) => TTarget[] {
    this.validateMappingConfig(mapping);

    return (sources: TSource[], _parent?: unknown, context?: MappingContext) => {
      const runtimeOptions = this.prepareRuntimeOptions(options, context);
      return this.convertArray(sources, targetClass, mapping, runtimeOptions);
    };
  }

  /**
   * Merges multiple objects into a target class instance
   * Later sources override earlier ones for conflicting properties
   *
   * @param sources - Array of source objects to merge
   * @param targetClass - Target class constructor
   * @param mapping - Array of field mappings
   * @param options - Optional mapping configuration
   * @returns Merged target class instance
   */
  public static merge<TTarget>(
    sources: unknown[],
    targetClass: Constructor<TTarget>,
    mapping: FieldMapping[],
    options?: MappingOptions,
  ): TTarget {
    const mergedSource: Record<string, unknown> = {};

    for (const source of sources) {
      if (source && typeof source === 'object') {
        Object.assign(mergedSource, deepClone(source));
      }
    }

    return this.convert(mergedSource, targetClass, mapping, options);
  }

  /**
   * Converts object to a plain object (strips class prototype)
   *
   * @param source - Source object
   * @param mapping - Optional field mappings (if not provided, copies all fields)
   * @returns Plain object with mapped values
   */
  public static toPlainObject<TSource>(source: TSource, mapping?: FieldMapping[]): Record<string, unknown> {
    if (source === null || source === undefined) {
      throw new MappingError('Source object cannot be null or undefined', 'source', source);
    }

    if (!mapping) {
      // If no mapping provided, shallow clone all enumerable properties
      return { ...(source as object) } as Record<string, unknown>;
    }

    const result: Record<string, unknown> = {};
    const context: MappingContext = { source, targetType: Object as unknown as Constructor<unknown>, data: {} };

    for (const fieldMap of mapping) {
      this.processFieldMapping(
        source,
        result,
        fieldMap,
        context,
        { ...this.DEFAULT_OPTIONS, strictMapping: false },
        new Map(),
      );
    }

    return result;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Wraps errors from field mapping with proper context
   */
  private static wrapMappingError(error: unknown, fieldMap: FieldMapping, source: unknown): never {
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

  /**
   * Applies AutoMap logic to copy matching properties
   */
  private static applyAutoMapping(
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
        /* istanbul ignore next */
        continue;
      }
      if (mappedTargetProps.has(key)) {
        /* istanbul ignore next */
        continue;
      }

      if (Object.hasOwn(sourceObj, key)) {
        const value = sourceObj[key];
        if (value === undefined && !options.copyUndefined) {
          /* istanbul ignore next */
          continue;
        }
        target[key] = deepClone(value);
      }
    }
  }

  /**
   * Throws validation errors if any accumulated
   */
  private static throwValidationErrors(validationErrors: Map<string, string[]>): void {
    if (validationErrors.size === 0) return;

    const errorMessages = Array.from(validationErrors.entries())
      .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
      .join('; ');
    throw new ValidationError(`Validation failed: ${errorMessages}`, validationErrors);
  }

  /**
   * Handles missing or null values with defaultValue and optional logic
   */
  private static handleMissingValue(
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
   * Runs validators on a value and accumulates errors
   */
  private static runValidators(
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
        const existingErrors = validationErrors.get(targetField) || [];
        validationErrors.set(targetField, [...existingErrors, ...result.errors]);
      }
    }
  }

  /**
   * Processes a single field mapping
   */
  private static processFieldMapping(
    source: unknown,
    target: Record<string, unknown>,
    fieldMap: FieldMapping,
    context: MappingContext,
    options: Required<MappingOptions>,
    validationErrors: Map<string, string[]>,
  ): void {
    const { from, to = from, transform } = fieldMap;

    let value = getNestedValue(source, from);

    const { shouldSkip, processedValue } = this.handleMissingValue(value, fieldMap, options, source, context);
    if (shouldSkip) return;

    value = processedValue;

    if (transform && value !== undefined) {
      value = transform(value, source, context);
    }

    this.runValidators(value, fieldMap, context, validationErrors);

    if (options.strictMapping && !(to in target)) {
      throw new MappingError(`Strict mapping failed: Property '${to}' does not exist in target type`, to, value);
    }

    setNestedValue(target, to, value);
  }

  /**
   * Validates mapping configuration at creation time
   */
  private static validateMappingConfig(mapping: FieldMapping[]): void {
    if (!Array.isArray(mapping)) {
      throw new MappingError('Mapping must be an array', 'mapping', mapping);
    }

    const seenTargets = new Set<string>();

    for (const fieldMap of mapping) {
      if (!fieldMap.from || typeof fieldMap.from !== 'string') {
        throw new MappingError("Invalid mapping: 'from' must be a non-empty string", 'from', fieldMap.from);
      }

      const targetPath = fieldMap.to || fieldMap.from;

      if (seenTargets.has(targetPath)) {
        console.warn(
          `[Objecter] Warning: Duplicate target path '${targetPath}' in mapping. ` +
            'Later mapping will override earlier one.',
        );
      }
      seenTargets.add(targetPath);
    }
  }

  /**
   * Prepares runtime options by merging with execution context
   */
  private static prepareRuntimeOptions(options?: MappingOptions, context?: MappingContext): MappingOptions {
    const runtimeOptions = { ...options };
    if (context?.data) {
      runtimeOptions.context = { ...options?.context, ...context.data };
    }
    return runtimeOptions;
  }
}

export default Objecter;
