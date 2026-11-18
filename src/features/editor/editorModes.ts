// D15: the document is shown either as the Visual editor or as its raw Markdown source.
export const VIEW_MODES = ['visual', 'markdown'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

// D1: Ambient lets the co-author suggest on its own; On Demand waits for the user to ask.
// State only until the AI phases give each mode its behavior.
export const AI_MODES = ['ambient', 'on-demand'] as const;
export type AiMode = (typeof AI_MODES)[number];
