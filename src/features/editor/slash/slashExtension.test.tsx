import { Editor, type JSONContent } from '@tiptap/core';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEditorExtensions } from '../markdown/extensions';
import { SLASH_ITEMS } from './slashItems';
import {
  createSlashExtension,
  type SlashMenuHandlers,
  type SlashSuggestionProps,
} from './slashExtension';

// D12: `/` opens the menu; Space and Esc keep the typed `/`; never opens over a selection.
// Runs against a real headless editor, so the suggestion plugin sees real transactions.
function createHandlers(): SlashMenuHandlers {
  return {
    onStart: vi.fn<(props: SlashSuggestionProps) => void>(),
    onUpdate: vi.fn<(props: SlashSuggestionProps) => void>(),
    onKeyDown: vi.fn<(props: SuggestionKeyDownProps) => boolean>(() => false),
    onExit: vi.fn<() => void>(),
  };
}

function paragraphDoc(text: string): JSONContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: text.length > 0 ? [{ type: 'text', text }] : [] }],
  };
}

let editor: Editor | null = null;

function createEditor(text: string, handlers: SlashMenuHandlers): Editor {
  const created = new Editor({
    element: document.createElement('div'),
    extensions: [...createEditorExtensions(), createSlashExtension(handlers)],
    content: paragraphDoc(text),
  });
  editor = created;
  return created;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('slash extension', () => {
  it('opens when the slash is typed into an empty paragraph', async () => {
    const handlers = createHandlers();
    const created = createEditor('', handlers);
    created.commands.insertContent('/');
    await vi.waitFor(() => {
      expect(handlers.onStart).toHaveBeenCalledTimes(1);
    });
    expect(created.getText()).toBe('/');
  });

  it('closes on Space and keeps the slash as text', async () => {
    const handlers = createHandlers();
    const created = createEditor('', handlers);
    created.commands.insertContent('/');
    await vi.waitFor(() => {
      expect(handlers.onStart).toHaveBeenCalledTimes(1);
    });
    created.commands.insertContent(' ');
    await vi.waitFor(() => {
      expect(handlers.onExit).toHaveBeenCalledTimes(1);
    });
    expect(created.getText()).toContain('/');
  });

  it('closes on Escape and keeps the slash as text', async () => {
    const handlers = createHandlers();
    const created = createEditor('', handlers);
    created.commands.insertContent('/');
    await vi.waitFor(() => {
      expect(handlers.onStart).toHaveBeenCalledTimes(1);
    });
    created.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => {
      expect(handlers.onExit).toHaveBeenCalledTimes(1);
    });
    expect(created.getText()).toBe('/');
  });

  it('never opens over a non-empty selection', () => {
    const handlers = createHandlers();
    const created = createEditor('a /rewrite', handlers);
    created.commands.setTextSelection({ from: 10, to: 11 });
    expect(handlers.onStart).not.toHaveBeenCalled();
  });

  it('does not open when the typed filter matches nothing', () => {
    const handlers = createHandlers();
    const created = createEditor('', handlers);
    created.commands.insertContent('/zzz');
    expect(handlers.onStart).not.toHaveBeenCalled();
    expect(created.getText()).toBe('/zzz');
  });

  it('passes arrow and Enter keys to the caller while open', async () => {
    const handlers = createHandlers();
    const created = createEditor('', handlers);
    created.commands.insertContent('/');
    await vi.waitFor(() => {
      expect(handlers.onStart).toHaveBeenCalledTimes(1);
    });
    created.view.dom.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    const keyProps = vi.mocked(handlers.onKeyDown).mock.calls.at(-1)?.[0];
    expect(keyProps?.event.key).toBe('ArrowDown');
  });

  it('narrows the items as the query is typed', async () => {
    const handlers = createHandlers();
    const created = createEditor('', handlers);
    created.commands.insertContent('/tone');
    // onStart runs while items load (empty); the filtered list arrives in a later onUpdate.
    await vi.waitFor(() => {
      const last = vi.mocked(handlers.onUpdate).mock.calls.at(-1)?.[0];
      expect(last?.items.map((item) => item.id)).toEqual(['change-tone']);
    });
  });

  it('removes the typed query when an item is chosen through command', async () => {
    const handlers = createHandlers();
    const created = createEditor('', handlers);
    created.commands.insertContent('/tone');
    await vi.waitFor(() => {
      expect(handlers.onStart).toHaveBeenCalled();
    });
    const props = vi.mocked(handlers.onStart).mock.calls.at(0)?.[0];
    const changeTone = SLASH_ITEMS.find((item) => item.id === 'change-tone');
    expect(props).toBeDefined();
    expect(changeTone).toBeDefined();
    if (props !== undefined && changeTone !== undefined) {
      props.command(changeTone);
    }
    expect(created.getText()).toBe('');
  });
});
