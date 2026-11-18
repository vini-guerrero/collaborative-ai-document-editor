import { useState, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { applyMarkdownSource } from './applyMarkdownSource';
import type { ViewMode } from './editorModes';
import { downloadMarkdown, markdownFilename } from './exportMarkdown';
import { serializeMarkdown } from './markdown/markdown';
import type { EditorDraft } from './useDocumentPersistence';

export interface MarkdownViewInput {
  editorRef: RefObject<Editor | null>;
  latestRef: RefObject<EditorDraft>;
  scheduleBody: (body: string) => void;
  // The document title, for the exported file name.
  title: string;
}

export interface MarkdownView {
  readonly viewMode: ViewMode;
  // The raw Markdown being edited while the Markdown view is shown (D15).
  readonly source: string;
  readonly setSource: (text: string) => void;
  readonly changeViewMode: (next: ViewMode) => void;
  // Downloads what is on screen as a .md file.
  readonly exportMarkdown: () => void;
}

// D15: the Visual or Markdown view of one document. Entering the raw view copies the editor's
// Markdown; leaving it parses the text back into the editor, which stays mounted so its undo
// history survives the switch.
export function useMarkdownView({
  editorRef,
  latestRef,
  scheduleBody,
  title,
}: MarkdownViewInput): MarkdownView {
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  const [source, setSource] = useState('');

  const changeViewMode = (next: ViewMode): void => {
    const editor = editorRef.current;
    if (editor === null || next === viewMode) {
      return;
    }
    if (next === 'markdown') {
      setSource(serializeMarkdown(editor));
    } else {
      const body = applyMarkdownSource(editor, source);
      if (body !== latestRef.current.body) {
        scheduleBody(body);
      }
    }
    setViewMode(next);
  };

  const exportMarkdown = (): void => {
    const editor = editorRef.current;
    if (editor === null) {
      return;
    }
    const body = viewMode === 'markdown' ? source : serializeMarkdown(editor);
    downloadMarkdown(markdownFilename(title), body);
  };

  return { viewMode, source, setSource, changeViewMode, exportMarkdown };
}
