import type { ToggleGroupOption } from '@/design-system';

// D15: the document is shown either as the Visual editor or as its raw Markdown source.
export const VIEW_MODES = ['visual', 'markdown'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

// D1: Ambient lets the co-author suggest on its own; On Demand waits for the user to ask.
// State only until the AI phases give each mode its behavior.
export const AI_MODES = ['ambient', 'on-demand'] as const;
export type AiMode = (typeof AI_MODES)[number];

export const VIEW_MODE_OPTIONS: readonly ToggleGroupOption[] = [
  { value: 'visual', label: 'Visual' },
  { value: 'markdown', label: 'Markdown' },
];

export const AI_MODE_OPTIONS: readonly ToggleGroupOption[] = [
  { value: 'ambient', label: 'Ambient' },
  { value: 'on-demand', label: 'On Demand' },
];

// Narrows a ToggleGroup value (a plain string) to a mode; undefined for anything unknown.
export function toViewMode(value: string): ViewMode | undefined {
  return VIEW_MODES.find((mode) => mode === value);
}

export function toAiMode(value: string): AiMode | undefined {
  return AI_MODES.find((mode) => mode === value);
}
