import type { Editor } from '@tiptap/react';
import type { IconName } from '@/design-system';

export interface FormattingControl {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  // Whether the format is on at the caret or selection; undo and redo are not toggles.
  readonly isActive?: (editor: Editor) => boolean;
  readonly canRun: (editor: Editor) => boolean;
  readonly run: (editor: Editor) => void;
}

// Groups are separated by a divider. Every command is a plain TipTap command, so each one is a
// single transaction and a single undo step (T3).
export const FORMATTING_GROUPS: readonly (readonly FormattingControl[])[] = [
  [
    {
      id: 'undo',
      label: 'Undo',
      icon: 'undo',
      canRun: (editor) => editor.can().undo(),
      run: (editor) => editor.chain().focus().undo().run(),
    },
    {
      id: 'redo',
      label: 'Redo',
      icon: 'redo',
      canRun: (editor) => editor.can().redo(),
      run: (editor) => editor.chain().focus().redo().run(),
    },
  ],
  [
    {
      id: 'heading-1',
      label: 'Heading 1',
      icon: 'heading-1',
      isActive: (editor) => editor.isActive('heading', { level: 1 }),
      canRun: (editor) => editor.can().toggleHeading({ level: 1 }),
      run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'heading-2',
      label: 'Heading 2',
      icon: 'heading-2',
      isActive: (editor) => editor.isActive('heading', { level: 2 }),
      canRun: (editor) => editor.can().toggleHeading({ level: 2 }),
      run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'heading-3',
      label: 'Heading 3',
      icon: 'heading-3',
      isActive: (editor) => editor.isActive('heading', { level: 3 }),
      canRun: (editor) => editor.can().toggleHeading({ level: 3 }),
      run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ],
  [
    {
      id: 'bold',
      label: 'Bold',
      icon: 'bold',
      isActive: (editor) => editor.isActive('bold'),
      canRun: (editor) => editor.can().toggleBold(),
      run: (editor) => editor.chain().focus().toggleBold().run(),
    },
    {
      id: 'italic',
      label: 'Italic',
      icon: 'italic',
      isActive: (editor) => editor.isActive('italic'),
      canRun: (editor) => editor.can().toggleItalic(),
      run: (editor) => editor.chain().focus().toggleItalic().run(),
    },
    {
      id: 'strike',
      label: 'Strikethrough',
      icon: 'strikethrough',
      isActive: (editor) => editor.isActive('strike'),
      canRun: (editor) => editor.can().toggleStrike(),
      run: (editor) => editor.chain().focus().toggleStrike().run(),
    },
    {
      id: 'code',
      label: 'Inline Code',
      icon: 'code',
      isActive: (editor) => editor.isActive('code'),
      canRun: (editor) => editor.can().toggleCode(),
      run: (editor) => editor.chain().focus().toggleCode().run(),
    },
  ],
  [
    {
      id: 'bullet-list',
      label: 'Bulleted List',
      icon: 'list',
      isActive: (editor) => editor.isActive('bulletList'),
      canRun: (editor) => editor.can().toggleBulletList(),
      run: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ordered-list',
      label: 'Numbered List',
      icon: 'list-ordered',
      isActive: (editor) => editor.isActive('orderedList'),
      canRun: (editor) => editor.can().toggleOrderedList(),
      run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'blockquote',
      label: 'Quote',
      icon: 'quote',
      isActive: (editor) => editor.isActive('blockquote'),
      canRun: (editor) => editor.can().toggleBlockquote(),
      run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'code-block',
      label: 'Code Block',
      icon: 'code-block',
      isActive: (editor) => editor.isActive('codeBlock'),
      canRun: (editor) => editor.can().toggleCodeBlock(),
      run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
  ],
];
