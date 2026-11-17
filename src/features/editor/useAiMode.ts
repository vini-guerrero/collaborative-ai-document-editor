import { useState } from 'react';
import type { AiMode } from './editorModes';

export interface AiModeState {
  aiMode: AiMode;
  setAiMode: (mode: AiMode) => void;
}

// D1: the editor's AI mode, held at the lowest scope that works (the editor form). Defaults to
// Ambient. Later phases read it from the form's props; it has no behavior yet.
export function useAiMode(): AiModeState {
  const [aiMode, setAiMode] = useState<AiMode>('ambient');
  return { aiMode, setAiMode };
}
