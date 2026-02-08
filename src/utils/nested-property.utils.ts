/**
 * Cache for parsed path parts to avoid repeated string splitting
 */
/**
 * Cache for parsed path parts to avoid repeated string splitting
 * Exported for testing purposes
 */
export const pathCache = new Map<string, string[]>();

/**
 * Gets cached path parts or parses and caches them
 */
function getPathParts(path: string): string[] {
  let parts = pathCache.get(path);
  if (!parts) {
    if (pathCache.size >= 1000) {
      pathCache.clear();
    }
    parts = path.split('.');
    pathCache.set(path, parts);
  }
  return parts;
}

/**
 * Safely gets a nested property value using dot notation
 * @example getNestedValue({ user: { name: 'John' } }, 'user.name') => 'John'
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  const keys = getPathParts(path);
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object') {
      return undefined;
    }

    // Handle array index access (e.g., 'items[0].name' or 'items.0.name')
    const arrayMatch = new RegExp(/^(\w+)\[(\d+)\]$/).exec(key);
    if (arrayMatch) {
      const [, arrayKey, indexStr] = arrayMatch;
      const arr = (current as Record<string, unknown>)[arrayKey];
      if (!Array.isArray(arr)) {
        return undefined;
      }
      current = arr[Number.parseInt(indexStr, 10)];
    } else {
      current = (current as Record<string, unknown>)[key];
    }
  }

  return current;
}

/**
 * Validates that a key is not a prototype pollution vector
 */
function validateSecureKey(key: string, path: string): void {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    throw new Error(`Security Error: Forbidden key '${key}' in path '${path}'`);
  }
}

/**
 * Handles array index notation in path and returns the target object
 */
function handleArrayPath(current: Record<string, unknown>, key: string, path: string): Record<string, unknown> {
  // arrayMatch is guaranteed by the caller (setNestedValue)
  const arrayMatch = new RegExp(/^(\w+)\[(\d+)\]$/).exec(key);
  /* istanbul ignore next */
  if (!arrayMatch) {
    return current;
  }

  const [, arrayKey, indexStr] = arrayMatch;
  validateSecureKey(arrayKey, path);

  const index = Number.parseInt(indexStr, 10);
  if (!current[arrayKey]) {
    current[arrayKey] = [];
  }
  const arr = current[arrayKey] as unknown[];
  if (!arr[index]) {
    arr[index] = {};
  }
  return arr[index] as Record<string, unknown>;
}

/**
 * Safely sets a nested property value using dot notation
 * Creates intermediate objects as needed
 * @example setNestedValue({}, 'user.name', 'John') => { user: { name: 'John' } }
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = getPathParts(path);
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    validateSecureKey(key, path);

    const arrayMatch = new RegExp(/^(\w+)\[(\d+)\]$/).exec(key);
    if (arrayMatch) {
      current = handleArrayPath(current, key, path);
    } else {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
  }

  const finalKey = keys.at(-1);
  if (!finalKey) {
    throw new Error(`Invalid path: empty final key in '${path}'`);
  }
  validateSecureKey(finalKey, path);
  current[finalKey] = value;
}
