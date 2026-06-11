import type { SchedulingAlgorithm } from './types';
import { leitnerAlgorithm } from './algorithms/leitner';
import { sm2Algorithm } from './algorithms/sm2';
import { fsrsAlgorithm } from './algorithms/fsrs';

const registry = new Map<string, SchedulingAlgorithm>([
  ['leitner', leitnerAlgorithm],
  ['sm2', sm2Algorithm],
  ['fsrs', fsrsAlgorithm],
]);

export function getAlgorithm(name: string): SchedulingAlgorithm {
  const algo = registry.get(name);
  if (!algo) throw new Error(`Unknown scheduling algorithm: "${name}". Available: ${listAlgorithms().join(', ')}`);
  return algo;
}

export function listAlgorithms(): string[] {
  return Array.from(registry.keys());
}
