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
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, indexStr] = arrayMatch;
      const arr = (current as Record<string, unknown>)[arrayKey];
      if (!Array.isArray(arr)) {
        return undefined;
      }
      current = arr[parseInt(indexStr, 10)];
    } else {
      current = (current as Record<string, unknown>)[key];
    }
  }

  return current;
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

    // Security: Block prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error(`Security Error: Forbidden key '${key}' in path '${path}'`);
    }

    // Handle array index in path
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, indexStr] = arrayMatch;

      // Security: Block prototype pollution in array key too
      if (arrayKey === '__proto__' || arrayKey === 'constructor' || arrayKey === 'prototype') {
        throw new Error(`Security Error: Forbidden key '${arrayKey}' in path '${path}'`);
      }

      const index = parseInt(indexStr, 10);
      if (!current[arrayKey]) {
        current[arrayKey] = [];
      }
      const arr = current[arrayKey] as unknown[];
      if (!arr[index]) {
        arr[index] = {};
      }
      current = arr[index] as Record<string, unknown>;
    } else {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
  }

  const finalKey = keys[keys.length - 1];
  // Security check for final key
  if (finalKey === '__proto__' || finalKey === 'constructor' || finalKey === 'prototype') {
    throw new Error(`Security Error: Forbidden key '${finalKey}' in path '${path}'`);
  }
  current[finalKey] = value;
}
