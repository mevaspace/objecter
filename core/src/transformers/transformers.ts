import { TransformFn } from '../types';
import { getNestedValue } from '../utils';

const TRUTHY_VALUES = new Set(['true', '1', 'yes', 'on']);
const FALSY_VALUES = new Set(['false', '0', 'no', 'off']);

/**
 * Collection of common transform functions
 */
export const Transformers = {
  /**
   * Converts string to uppercase
   */
  toUpperCase: (): TransformFn<string, string> => (value) => (typeof value === 'string' ? value.toUpperCase() : value),

  /**
   * Converts string to lowercase
   */
  toLowerCase: (): TransformFn<string, string> => (value) => (typeof value === 'string' ? value.toLowerCase() : value),

  /**
   * Trims whitespace from string
   */
  trim: (): TransformFn<string, string> => (value) => (typeof value === 'string' ? value.trim() : value),

  /**
   * Converts to number
   */
  toNumber: (): TransformFn<unknown, number> => (value) => {
    const safeString = typeof value === 'symbol' ? value.toString() : JSON.stringify(value);
    if (value === null || value === undefined || value === '') {
      throw new TypeError(`Cannot convert '${safeString}' to number`);
    }
    const num = Number(value);
    if (Number.isNaN(num)) {
      throw new TypeError(`Cannot convert '${safeString}' to number`);
    }
    return num;
  },

  /**
   * Converts to string
   */
  toString: (): TransformFn<unknown, string> => String,

  /**
   * Converts to boolean
   */
  toBoolean: (): TransformFn<unknown, boolean> => (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (TRUTHY_VALUES.has(lower)) return true;
      if (FALSY_VALUES.has(lower)) return false;
    }
    return Boolean(value);
  },

  /**
   * Converts to Date object
   */
  toDate: (): TransformFn<unknown, Date> => (value) => {
    if (value instanceof Date) return value;
    const date = new Date(value as string | number);
    if (Number.isNaN(date.getTime())) {
      throw new TypeError(`Cannot convert '${String(value)}' to Date`);
    }
    return date;
  },

  /**
   * Formats date to ISO string
   */
  toISOString: (): TransformFn<Date | string | number, string> => (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new TypeError(`Cannot convert '${String(value)}' to ISO string`);
    }
    return date.toISOString();
  },

  /**
   * Safely parses JSON string
   * @param maxLength - Optional upper bound on input length; longer strings throw
   */
  parseJSON:
    <T>(maxLength?: number): TransformFn<string, T> =>
    (value) => {
      if (typeof value !== 'string') return value as T;
      if (maxLength !== undefined && value.length > maxLength) {
        throw new SyntaxError(`JSON string length ${value.length} exceeds maximum of ${maxLength}`);
      }
      try {
        return JSON.parse(value) as T;
      } catch {
        // Truncate to avoid echoing large untrusted payloads into error logs
        const shown = value.length > 100 ? `${value.slice(0, 100)}...` : value;
        throw new SyntaxError(`Invalid JSON: ${shown}`);
      }
    },

  /**
   * Converts to JSON string
   */
  toJSON: (): TransformFn<unknown, string> => (value) => JSON.stringify(value),

  /**
   * Rounds number to specified decimal places
   */
  round:
    (decimals: number = 0): TransformFn<number, number> =>
    (value) => {
      const factor = Math.pow(10, decimals);
      return Math.round(value * factor) / factor;
    },

  /**
   * Clamps number within range
   */
  clamp:
    (min: number, max: number): TransformFn<number, number> =>
    (value) =>
      Math.max(min, Math.min(max, value)),

  /**
   * Provides default value if source is null/undefined
   */
  defaultTo:
    <T>(defaultValue: T): TransformFn<T | null | undefined, T> =>
    (value) =>
      value ?? defaultValue,

  /**
   * Maps value using provided mapping object
   */
  mapValue:
    <TIn, TOut>(mapping: Record<string, TOut>, fallback?: TOut): TransformFn<TIn, TOut> =>
    (value) => {
      const key = String(value);
      // Prevent '[object Object]' lookup unless explicitly intended?
      // For now, consistent String() behavior is safest but let's at least check own property
      if (Object.prototype.hasOwnProperty.call(mapping, key)) {
        return mapping[key];
      }
      if (fallback !== undefined) {
        return fallback;
      }
      throw new Error(`No mapping found for value '${key}'`);
    },

  /**
   * Chains multiple transforms together
   */
  pipe:
    <TIn, TOut>(...transforms: TransformFn[]): TransformFn<TIn, TOut> =>
    (value, source, context) => {
      let result: unknown = value;
      for (const transform of transforms) {
        result = transform(result, source, context);
      }
      return result as TOut;
    },

  /**
   * Applies transform only if condition is met
   */
  when:
    <T>(predicate: (value: T) => boolean, transform: TransformFn<T>): TransformFn<T> =>
    (value, source, context) =>
      predicate(value) ? transform(value, source, context) : value,

  /**
   * Safely extracts nested value
   */
  pick:
    <T>(path: string): TransformFn<Record<string, unknown>, T> =>
    (value) =>
      getNestedValue(value, path) as T,

  /**
   * Splits string by delimiter
   */
  split:
    (delimiter: string): TransformFn<string, string[]> =>
    (value) =>
      typeof value === 'string' ? value.split(delimiter) : [],

  /**
   * Joins array by delimiter
   */
  join:
    (delimiter: string): TransformFn<unknown[], string> =>
    (value) =>
      Array.isArray(value) ? value.join(delimiter) : String(value),
};
