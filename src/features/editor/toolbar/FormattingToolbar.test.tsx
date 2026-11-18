import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readyEditor, renderEditorPage } from '../testing/editorHarness';
import { analyzeResponse } from '../testing/fakeAi';

const fetchImpl = () => Promise.resolve(analyzeResponse([]));

// Fake timers, as in the other editor tests, so nothing the editor schedules outlives a test.
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('formatting toolbar', () => {
  it('is a labelled toolbar of named controls in the Visual view', async () => {
    await readyEditor(renderEditorPage(fetchImpl));
    const toolbar = await screen.findByRole('toolbar', { name: 'Formatting' });
    expect(toolbar).toBeTruthy();
    for (const name of ['Bold', 'Italic', 'Heading 2', 'Bulleted List', 'Code Block', 'Undo']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it('applies bold to the selection and shows it pressed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const editor = await readyEditor(renderEditorPage(fetchImpl));
    act(() => {
      editor.commands.setContent('hello world', { contentType: 'markdown' });
      editor.commands.setTextSelection({ from: 1, to: 6 });
    });
    await user.click(await screen.findByRole('button', { name: 'Bold' }));
    expect(editor.getMarkdown()).toContain('**hello**');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bold' }).getAttribute('aria-pressed')).toBe(
        'true',
      );
    });
  });

  it('moves between controls with the arrow keys', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await readyEditor(renderEditorPage(fetchImpl));
    const undo = await screen.findByRole('button', { name: 'Undo' });
    const redo = screen.getByRole('button', { name: 'Redo' });
    expect(undo.getAttribute('tabindex')).toBe('0');
    expect(redo.getAttribute('tabindex')).toBe('-1');
    // Undo and Redo are disabled on a fresh document, so focus the first enabled control instead.
    const bold = screen.getByRole('button', { name: 'Bold' });
    bold.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Italic' }));
  });
});
