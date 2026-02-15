/**
 * Type guard to check if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deep clones a value to prevent mutation of source objects.
 * Internalized klona/lite algorithm for ~10x faster performance vs structuredClone.
 * Supports: plain objects, custom class instances, arrays, Date, RegExp.
 * Circular references are detected and will throw an error.
 */
/**
 * Deep clones a value to prevent mutation of source objects.
 * Internalized klona/lite algorithm for ~10x faster performance vs structuredClone.
 * Supports: plain objects, custom class instances, arrays, Date, RegExp.
 * Circular references are detected if checkCircular is true.
 */
export function deepClone<T>(value: T, checkCircular = false): T {
  return cloneValue(value, checkCircular ? new WeakSet() : undefined);
}

function markSeen(obj: object, seen: WeakSet<object> | undefined): void {
  if (!seen) return;
  if (seen.has(obj)) {
    throw new Error('Circular reference detected during deep clone');
  }
  seen.add(obj);
}

function cloneArray(src: unknown[], seen: WeakSet<object> | undefined): unknown[] {
  const len = src.length;
  const out = new Array(len);
  for (let i = len; i--; ) {
    out[i] = cloneValue(src[i], seen);
  }
  return out;
}

function cloneRegExp(re: RegExp): RegExp {
  const out = new RegExp(re.source, re.flags);
  out.lastIndex = re.lastIndex;
  return out;
}

function cloneCustomClass(src: Record<string, unknown>, seen: WeakSet<object> | undefined): Record<string, unknown> {
  const out = new (src.constructor as new () => Record<string, unknown>)();
  for (const k in src) {
    if (Object.prototype.hasOwnProperty.call(src, k) && out[k] !== src[k]) {
      out[k] = cloneValue(src[k], seen);
    }
  }
  return out;
}

function clonePlainObject(src: Record<string, unknown>, seen: WeakSet<object> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in src) {
    if (k === '__proto__') {
      Object.defineProperty(out, k, {
        value: cloneValue(src[k], seen),
        configurable: true,
        enumerable: true,
        writable: true,
      });
      continue;
    }
    out[k] = cloneValue(src[k], seen);
  }
  return out;
}

function cloneObject(src: Record<string, unknown>, seen: WeakSet<object> | undefined): Record<string, unknown> {
  if (src.constructor !== Object && typeof src.constructor === 'function') {
    return cloneCustomClass(src, seen);
  }
  return clonePlainObject(src, seen);
}

function cloneValue<T>(x: T, seen: WeakSet<object> | undefined): T {
  if (x === null || x === undefined || typeof x !== 'object') {
    return x;
  }

  const obj = x as object;
  markSeen(obj, seen);

  const tag = Object.prototype.toString.call(obj);

  if (tag === '[object Array]') return cloneArray(obj as unknown[], seen) as T;
  if (tag === '[object Date]') return new Date(+(obj as Date)) as T;
  if (tag === '[object RegExp]') return cloneRegExp(obj as RegExp) as T;
  if (tag === '[object Object]') return cloneObject(obj as Record<string, unknown>, seen) as T;

  return x;
}
