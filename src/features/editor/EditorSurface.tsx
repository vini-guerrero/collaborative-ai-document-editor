import { useEffect, useRef, useState, type JSX } from 'react';
import { EditorContent, useEditor, type Editor, type UseEditorOptions } from '@tiptap/react';
import { createCurrentBlockExtension } from './currentBlock/currentBlockExtension';
import { createEditorExtensions } from './markdown/extensions';
import { createFlagsPlugin } from './flags/flagsPlugin';
import { bindFlagOpener, createFlagNavigation } from './flagNavigation';
import { createSuggestionPlugin } from './suggestion/suggestionPlugin';
import { createRestructurePreviewExtension } from './restructure/restructurePreviewPlugin';
import { createSlashExtension } from './slash/slashExtension';
import { SlashMenu } from './slash/SlashMenu';
import { slashOptionDomId, type SlashItem } from './slash/slashItems';
import { useSlashMenu } from './slash/useSlashMenu';
import { AiBubbles } from './bubble/AiBubbles';
import { useParagraphBubbles } from './bubble/useParagraphBubbles';
import { HeadingActions } from './toolbar/HeadingActions';
import { useHeadingBoxes } from './toolbar/useHeadingBoxes';
import { useFlagAnalysis } from './useFlagAnalysis';
import { useFlags } from './useFlags';
import './flags/flags.css';
import './suggestion/suggestion.css';
import './EditorSurface.css';

export interface EditorSurfaceProps {
  // Stored Markdown, parsed once when the editor is created. The route keys the page by id,
  // so a new document always mounts a new surface.
  initialMarkdown: string;
  // Called with the canonical Markdown after every document change (T2: Markdown is the document;
  // D17: the caller autosaves it).
  onChange: (markdown: string) => void;
  // Called once per editor instance with the live editor (twice under StrictMode in dev, with the
  // same instance), so callers can drive it through its commands.
  onReady?: ((editor: Editor) => void) | undefined;
  // True while the AI must not analyze: On Demand (D1) or the raw Markdown view (D15).
  aiPaused: boolean;
  // Asked to open a flag's popover by keyboard or pointer (D17).
  onFlagOpen: (flagId: string) => void;
  // The slash menu item the author chose (D12).
  onSlashChoose: (item: SlashItem) => void;
  // "Improve Section" was pressed for the heading at this position (D9).
  onImprove: (headingPos: number) => void;
}

// T1, D13: TipTap owns the editing state; the document leaves it only as Markdown. The editor is
// created from Markdown with an explicit contentType, so stored text is never sniffed as HTML (T10).
// useEditor destroys the editor on unmount.
export function EditorSurface({
  initialMarkdown,
  onChange,
  onReady,
  aiPaused,
  onFlagOpen,
  onSlashChoose,
  onImprove,
}: EditorSurfaceProps): JSX.Element {
  // Refs keep the latest callbacks without recreating the editor on every render.
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  const actionsRef = useRef({ onSlashChoose, onImprove });
  useEffect(() => {
    onChangeRef.current = onChange;
    onReadyRef.current = onReady;
    actionsRef.current = { onSlashChoose, onImprove };
  });

  // The menu's handlers are stable, so the extension built once below keeps working.
  const slash = useSlashMenu((item) => {
    actionsRef.current.onSlashChoose(item);
  });

  // Built once per mount. TipTap compares options on every render, so a new object or callback
  // each render would call setOptions on every title keystroke.
  const [options] = useState<UseEditorOptions>(() => ({
    extensions: [
      ...createEditorExtensions(),
      createFlagsPlugin(),
      createSuggestionPlugin(),
      createFlagNavigation(),
      createSlashExtension(slash.handlers),
      createRestructurePreviewExtension(),
      createCurrentBlockExtension(),
    ],
    contentType: 'markdown',
    content: initialMarkdown,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Document',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor: current }) => {
      onChangeRef.current(current.getMarkdown());
    },
  }));
  const editor = useEditor(options);
  const analyzingHash = useFlagAnalysis(editor, aiPaused);
  const bubbles = useParagraphBubbles(editor, analyzingHash, useFlags(editor));
  const headings = useHeadingBoxes(editor);

  // The keyboard's active menu item is announced through the editor, which keeps focus (D12).
  const activeItem = slash.view === null ? undefined : slash.view.items[slash.view.activeIndex];
  const activeId = activeItem === undefined ? null : slashOptionDomId(activeItem.id);
  useEffect(() => {
    if (activeId === null) {
      editor.view.dom.removeAttribute('aria-activedescendant');
    } else {
      editor.view.dom.setAttribute('aria-activedescendant', activeId);
    }
  }, [editor, activeId]);

  // The extension reads its callback from editor storage; this effect keeps it current (D17).
  useEffect(() => {
    bindFlagOpener(editor, onFlagOpen);
  }, [editor, onFlagOpen]);

  useEffect(() => {
    onReadyRef.current?.(editor);
  }, [editor]);

  return (
    <div className="editor-surface-frame">
      <EditorContent editor={editor} className="editor-surface" />
      <HeadingActions
        boxes={headings}
        onImprove={(headingPos) => {
          actionsRef.current.onImprove(headingPos);
        }}
      />
      <AiBubbles bubbles={bubbles} onOpenFlag={onFlagOpen} />
      {slash.view === null ? null : (
        <SlashMenu
          items={slash.view.items}
          activeIndex={slash.view.activeIndex}
          position={slash.view.position}
          onSelect={slash.choose}
        />
      )}
    </div>
  );
}
