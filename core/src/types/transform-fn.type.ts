import type { MappingContext } from './mapping-context.interface';

/**
 * Transform function for value conversion
 */
export type TransformFn<TInput = any, TOutput = unknown> = (
  value: TInput,
  source: unknown,
  context?: MappingContext,
) => TOutput;
