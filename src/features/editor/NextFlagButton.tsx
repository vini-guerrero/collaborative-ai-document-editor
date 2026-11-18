import type { JSX } from 'react';
import type { Editor } from '@tiptap/react';
import { Button } from '@/design-system';
import { goToNextFlag } from './flagNavigation';
import { useFlags } from './useFlags';

export interface NextFlagButtonProps {
  editor: Editor;
  onOpenFlag: (flagId: string) => void;
}

// D17: the touch and pointer route to the next flag. It exists only while a flag does.
export function NextFlagButton({ editor, onOpenFlag }: NextFlagButtonProps): JSX.Element | null {
  const flags = useFlags(editor);
  if (flags.length === 0) {
    return null;
  }
  return (
    <Button
      onClick={() => {
        const flag = goToNextFlag(editor);
        if (flag !== undefined) {
          onOpenFlag(flag.id);
        }
      }}
    >
      Next Flag
    </Button>
  );
}
