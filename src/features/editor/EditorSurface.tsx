import { useEffect, useRef, useState, type JSX } from 'react';
import { EditorContent, useEditor, type Editor, type UseEditorOptions } from '@tiptap/react';
import { createEditorExtensions } from './markdown/extensions';
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
}

// T1, D13: TipTap owns the editing state; the document leaves it only as Markdown. The editor is
// created from Markdown with an explicit contentType, so stored text is never sniffed as HTML (T10).
// useEditor destroys the editor on unmount.
export function EditorSurface({
  initialMarkdown,
  onChange,
  onReady,
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
    extensions: createEditorExtensions(),
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

  useEffect(() => {
    onReadyRef.current?.(editor);
  }, [editor]);

  return <EditorContent editor={editor} className="editor-surface" />;
}
