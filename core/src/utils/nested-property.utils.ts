/**
 * Precompiled regex for array index notation (e.g. 'items[0]')
 */
const ARRAY_INDEX_REGEX = /^(\w+)\[(\d+)\]$/;

/**
 * Set of forbidden keys to prevent prototype pollution
 */
export const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Parsed segment representing a single key in a dot-notation path
 */
interface ParsedSegment {
  raw: string;
  isArray: boolean;
  arrayKey: string;
  arrayIndex: number;
}

/**
 * Cache for fully parsed path segments to avoid repeated string splitting and regex matching
 * Exported for testing purposes
 */
export const pathCache = new Map<string, ParsedSegment[]>();

/**
 * Parses a single key into a ParsedSegment
 */
function parseSegment(key: string): ParsedSegment {
  const match = ARRAY_INDEX_REGEX.exec(key);
  if (match) {
    return { raw: key, isArray: true, arrayKey: match[1], arrayIndex: Number.parseInt(match[2], 10) };
  }
  return { raw: key, isArray: false, arrayKey: '', arrayIndex: 0 };
}

/**
 * Gets cached parsed segments or parses and caches them
 */
function getPathSegments(path: string): ParsedSegment[] {
  let segments = pathCache.get(path);
  if (!segments) {
    if (pathCache.size >= 1000) {
      // Evict the oldest entry (Map preserves insertion order) instead of
      // clearing the whole cache, which would cause a GC spike under churn
      const oldest = pathCache.keys().next().value;
      if (oldest !== undefined) {
        pathCache.delete(oldest);
      }
    }
    const parts = path.split('.');
    segments = parts.map((part) => parseSegment(part));
    pathCache.set(path, segments);
  }
  return segments;
}

/**
 * Safely gets a nested property value using dot notation
 * @example getNestedValue({ user: { name: 'John' } }, 'user.name') => 'John'
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  const segments = getPathSegments(path);
  let current: unknown = obj;

  for (const element of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object') {
      return undefined;
    }

    const seg = element;
    // Block reads through prototype-pollution vectors: paths like
    // 'constructor.prototype' or '__proto__' must behave as missing fields
    if (FORBIDDEN_KEYS.has(seg.isArray ? seg.arrayKey : seg.raw)) {
      return undefined;
    }
    if (seg.isArray) {
      const arr = (current as Record<string, unknown>)[seg.arrayKey];
      if (!Array.isArray(arr)) {
        return undefined;
      }
      current = arr[seg.arrayIndex];
    } else {
      current = (current as Record<string, unknown>)[seg.raw];
    }
  }

  return current;
}

/**
 * Validates that a key is not a prototype pollution vector
 */
function validateSecureKey(key: string, path: string): void {
  if (FORBIDDEN_KEYS.has(key)) {
    throw new Error(`Security Error: Forbidden key '${key}' in path '${path}'`);
  }
}

/**
 * Handles array index notation in path and returns the target object
 */
function handleArraySegment(
  current: Record<string, unknown>,
  seg: ParsedSegment,
  path: string,
): Record<string, unknown> {
  validateSecureKey(seg.arrayKey, path);

  if (!current[seg.arrayKey]) {
    current[seg.arrayKey] = [];
  }
  const arr = current[seg.arrayKey] as unknown[];
  if (!arr[seg.arrayIndex]) {
    arr[seg.arrayIndex] = {};
  }
  return arr[seg.arrayIndex] as Record<string, unknown>;
}

/**
 * Safely sets a nested property value using dot notation
 * Creates intermediate objects as needed
 * @example setNestedValue({}, 'user.name', 'John') => { user: { name: 'John' } }
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const segments = getPathSegments(path);
  let current = obj;
  const lastIndex = segments.length - 1;

  for (let i = 0; i < lastIndex; i++) {
    const seg = segments[i];

    if (seg.isArray) {
      current = handleArraySegment(current, seg, path);
    } else {
      validateSecureKey(seg.raw, path);
      if (!current[seg.raw] || typeof current[seg.raw] !== 'object') {
        current[seg.raw] = {};
      }
      current = current[seg.raw] as Record<string, unknown>;
    }
  }

  const finalSeg = segments[lastIndex];
  if (!finalSeg) {
    throw new Error(`Invalid path: empty final key in '${path}'`);
  }
  validateSecureKey(finalSeg.raw, path);
  current[finalSeg.raw] = value;
}
