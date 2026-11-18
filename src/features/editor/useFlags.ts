import { useCallback, useSyncExternalStore } from 'react';
import type { Editor } from '@tiptap/react';
import { getFlags } from './flags/flagsPlugin';
import type { FlagEntry } from './flags/flagsState';

const NO_FLAGS: readonly FlagEntry[] = [];

// The flags are the plugin's state (T3, D2). Every transaction may change them, so the hook
// re-reads them on each one. The callbacks are stable per editor, as useSyncExternalStore needs.
export function useFlags(editor: Editor | null): readonly FlagEntry[] {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      if (editor === null) {
        return () => undefined;
      }
      editor.on('transaction', onChange);
      return () => {
        editor.off('transaction', onChange);
      };
    },
    [editor],
  );
  const getSnapshot = useCallback(
    (): readonly FlagEntry[] => (editor === null ? NO_FLAGS : getFlags(editor.state)),
    [editor],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => NO_FLAGS);
}
