import { MappingError } from '../errors';
import { FieldMapping, MappingProfile } from '../types';

/**
 * Profile registry for reusable mapping definitions
 */
const profiles = new Map<string, MappingProfile>();

/**
 * Registers a mapping profile for reuse
 *
 * @param profile - Mapping profile definition
 * @returns The registered profile (for chaining or type-safe name usage)
 * @throws {MappingError} When profile name is empty
 */
export function registerProfile<TTarget = unknown>(profile: MappingProfile<TTarget>): MappingProfile<TTarget> {
  if (!profile.name || typeof profile.name !== 'string' || profile.name.trim() === '') {
    throw new MappingError('Profile name must be a non-empty string', 'profileName', profile.name);
  }
  validateMappingConfig(profile.mapping);
  profiles.set(profile.name, profile as MappingProfile);
  return profile;
}

/**
 * Clears all registered profiles
 */
export function clearProfiles(): void {
  profiles.clear();
}

/**
 * Maps a source object using a registered profile
 *
 * @param profileName - Name of the registered profile
 * @returns The found profile
 * @throws {MappingError} When profile is not found
 */
export function getProfile(profileName: string): MappingProfile | undefined {
  return profiles.get(profileName);
}

/**
 * Validates mapping configuration at creation time
 */
export function validateMappingConfig(mapping: FieldMapping[]): void {
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
      throw new MappingError('Duplicate mapping target:', targetPath, targetPath);
    }
    seenTargets.add(targetPath);
  }
}
