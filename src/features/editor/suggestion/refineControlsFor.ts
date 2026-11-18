import type { RefineControlsProps } from '../refine/RefineControls';
import {
  canStepBack,
  canStepForward,
  instructionBudget,
  roundLabel,
} from '../refine/refineReducer';
import type { RewriteSession } from './useRewriteSession';

// D6: the refine controls for the open rewrite, wired to its picks. Null when nothing is open.
export function refineControlsFor(session: RewriteSession): RefineControlsProps | null {
  const { refine } = session;
  if (refine === null) {
    return null;
  }
  return {
    tone: refine.tone,
    length: refine.length,
    roundLabel: roundLabel(refine),
    canStepBack: canStepBack(refine),
    canStepForward: canStepForward(refine),
    instructionBudget: instructionBudget(refine),
    busy: session.busy,
    onToneChange: (tone) => {
      session.pick({ type: 'setTone', tone });
    },
    onLengthChange: (length) => {
      session.pick({ type: 'setLength', length });
    },
    onInstruction: (text) => {
      session.pick({ type: 'addInstruction', text });
    },
    onStepBack: session.stepBack,
    onStepForward: session.stepForward,
  };
}
