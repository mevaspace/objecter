import type { MappingContext } from './mapping-context.type';

/**
 * Transform function for value conversion
 */
// oxlint-disable-next-line typescript/no-explicit-any
export type TransformFn<TInput = any, TOutput = unknown> = (
  value: TInput,
  source: unknown,
  context?: MappingContext,
) => TOutput;
