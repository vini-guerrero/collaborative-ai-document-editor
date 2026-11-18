import { useEffect, useRef, useState, type JSX } from 'react';
import { EditorContent, useEditor, type Editor, type UseEditorOptions } from '@tiptap/react';
import { createEditorExtensions } from './markdown/extensions';
import { createFlagsPlugin } from './flags/flagsPlugin';
import { bindFlagOpener, createFlagNavigation } from './flagNavigation';
import { useFlagAnalysis } from './useFlagAnalysis';
import './flags/flags.css';
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
  // True while the AI must not analyze: On demand (D1) or the raw Markdown view (D15).
  aiPaused: boolean;
  // Asked to open a flag's popover by keyboard or pointer (D17).
  onFlagOpen: (flagId: string) => void;
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
}: EditorSurfaceProps): JSX.Element {
  // Refs keep the latest callbacks without recreating the editor on every render.
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onChangeRef.current = onChange;
    onReadyRef.current = onReady;
  });

  // Built once per mount. TipTap compares options on every render, so a new object or callback
  // each render would call setOptions on every title keystroke.
  const [options] = useState<UseEditorOptions>(() => ({
    extensions: [...createEditorExtensions(), createFlagsPlugin(), createFlagNavigation()],
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
  useFlagAnalysis(editor, aiPaused);

  // The extension reads its callback from editor storage; this effect keeps it current (D17).
  useEffect(() => {
    bindFlagOpener(editor, onFlagOpen);
  }, [editor, onFlagOpen]);

  useEffect(() => {
    onReadyRef.current?.(editor);
  }, [editor]);

  return <EditorContent editor={editor} className="editor-surface" />;
}
