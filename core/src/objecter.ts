import { MappingError } from './errors';
import { MappingOptions, Constructor, FieldMapping, MappingContext, MappingProfile } from './types';
import * as ConfigManager from './core/config-manager';
import * as ProfileRegistry from './core/profile-registry';
import * as Converter from './core/object-converter';

/**
 * Objecter - A lightweight object mapping library for TypeScript
 * Similar to MapStruct (Java) but without decorators
 */
export class Objecter {
  /**
   * Configures global default options for all conversions
   * These options will be merged with DEFAULT_OPTIONS and can be overridden per-call
   *
   * @param options - Global options to set
   */
  public static configure(options: Partial<MappingOptions>): void {
    ConfigManager.configure(options);
  }

  /**
   * Resets global options to empty (uses only DEFAULT_OPTIONS)
   */
  public static resetConfig(): void {
    ConfigManager.resetConfig();
  }

  /**
   * Registers a mapping profile for reuse
   *
   * @param profile - Mapping profile definition
   * @returns The registered profile (for chaining or type-safe name usage)
   * @throws {MappingError} When profile name is empty
   */
  public static registerProfile<TTarget = unknown>(profile: MappingProfile<TTarget>): MappingProfile<TTarget> {
    return ProfileRegistry.registerProfile(profile);
  }

  /**
   * Clears all registered profiles
   */
  public static clearProfiles(): void {
    ProfileRegistry.clearProfiles();
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
    const profile = ProfileRegistry.getProfile(profileName);
    if (!profile) {
      throw new MappingError(`Profile '${profileName}' not found`, 'profileName', profileName);
    }
    const mergedOptions = ConfigManager.getMergedOptions({ ...profile.options, ...options });
    return Converter.convert(source, profile.targetClass, profile.mapping, mergedOptions) as TTarget;
  }

  /**
   * Maps a source object using a registered profile with async transform support
   *
   * @param source - Source object to map
   * @param profileName - Name of the registered profile
   * @param options - Optional override options (merged with profile and global options)
   * @returns Promise of mapped target object
   * @throws {MappingError} When profile is not found
   */
  public static async mapAsync<TTarget>(
    source: unknown,
    profileName: string,
    options?: MappingOptions,
  ): Promise<TTarget> {
    const profile = ProfileRegistry.getProfile(profileName);
    if (!profile) {
      throw new MappingError(`Profile '${profileName}' not found`, 'profileName', profileName);
    }
    const mergedOptions = ConfigManager.getMergedOptions({ ...profile.options, ...options });
    return Converter.convertAsync(source, profile.targetClass, profile.mapping, mergedOptions) as Promise<TTarget>;
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
    mapping: FieldMapping<TSource, TTarget>[],
    options?: MappingOptions<TSource>,
  ): TTarget {
    const mergedOptions = ConfigManager.getMergedOptions(options);
    return Converter.convert(source, targetClass, mapping as FieldMapping[], mergedOptions);
  }

  /**
   * Converts a source object to a target class instance with async transform support
   *
   * @param source - Source object to convert
   * @param targetClass - Target class constructor
   * @param mapping - Array of field mappings (transforms may return Promises)
   * @param options - Optional mapping configuration
   * @returns Promise of target class instance with mapped values
   * @throws {MappingError} When a required field is missing
   * @throws {ValidationError} When validation fails
   */
  public static async convertAsync<TSource, TTarget>(
    source: TSource,
    targetClass: Constructor<TTarget>,
    mapping: FieldMapping<TSource, TTarget>[],
    options?: MappingOptions<TSource>,
  ): Promise<TTarget> {
    const mergedOptions = ConfigManager.getMergedOptions(options);
    return Converter.convertAsync(source, targetClass, mapping as FieldMapping[], mergedOptions);
  }

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
    mapping: FieldMapping<TSource, TTarget>[],
    options?: MappingOptions<TSource>,
  ): TTarget[] {
    const mergedOptions = ConfigManager.getMergedOptions(options);
    return Converter.convertArray(sources, targetClass, mapping as FieldMapping[], mergedOptions);
  }

  /**
   * Converts an array of source objects to target class instances with async transform support
   *
   * @param sources - Array of source objects
   * @param targetClass - Target class constructor
   * @param mapping - Array of field mappings (transforms may return Promises)
   * @param options - Optional mapping configuration
   * @returns Promise of array of target class instances
   */
  public static async convertArrayAsync<TSource, TTarget>(
    sources: TSource[],
    targetClass: Constructor<TTarget>,
    mapping: FieldMapping<TSource, TTarget>[],
    options?: MappingOptions<TSource>,
  ): Promise<TTarget[]> {
    const mergedOptions = ConfigManager.getMergedOptions(options);
    return Converter.convertArrayAsync(sources, targetClass, mapping as FieldMapping[], mergedOptions);
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
  public static convertArrayGenerator<TSource, TTarget>(
    sources: TSource[],
    targetClass: Constructor<TTarget>,
    mapping: FieldMapping<TSource, TTarget>[],
    options?: MappingOptions<TSource>,
  ): Generator<TTarget> {
    const mergedOptions = ConfigManager.getMergedOptions(options);
    return Converter.convertArrayGenerator(sources, targetClass, mapping as FieldMapping[], mergedOptions);
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
    mapping: FieldMapping<TSource, TTarget>[],
    options?: MappingOptions<TSource>,
  ): (source: TSource, _parent?: unknown, context?: MappingContext) => TTarget {
    ProfileRegistry.validateMappingConfig(mapping as FieldMapping[]);

    return (source: TSource, _parent?: unknown, context?: MappingContext) => {
      // Merge with global options at runtime
      const mergedOptions = ConfigManager.getMergedOptions(options);
      // Merge context if provided
      if (context?.data) {
        mergedOptions.context = { ...mergedOptions.context, ...context.data };
      }
      return Converter.convert(source, targetClass, mapping as FieldMapping[], mergedOptions);
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
    mapping: FieldMapping<TSource, TTarget>[],
    options?: MappingOptions<TSource>,
  ): (sources: TSource[], _parent?: unknown, context?: MappingContext) => TTarget[] {
    ProfileRegistry.validateMappingConfig(mapping as FieldMapping[]);

    return (sources: TSource[], _parent?: unknown, context?: MappingContext) => {
      const mergedOptions = ConfigManager.getMergedOptions(options);
      if (context?.data) {
        mergedOptions.context = { ...mergedOptions.context, ...context.data };
      }
      return Converter.convertArray(sources, targetClass, mapping as FieldMapping[], mergedOptions);
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
    const mergedOptions = ConfigManager.getMergedOptions(options);
    return Converter.merge(sources, targetClass, mapping, mergedOptions);
  }

  /**
   * Converts object to a plain object (strips class prototype)
   *
   * @param source - Source object
   * @param mapping - Optional field mappings (if not provided, copies all fields)
   * @returns Plain object with mapped values
   */
  public static toPlainObject<TSource>(source: TSource, mapping?: FieldMapping[]): Record<string, unknown> {
    return Converter.toPlainObject(source, mapping);
  }

  /**
   * Helper to use an interface or type as a target class for mapping.
   * Enables type-safe conversion without requiring a concrete class.
   */
  public static asTarget<T>(): Constructor<T> {
    return Object as unknown as Constructor<T>;
  }
}

export default Objecter;
