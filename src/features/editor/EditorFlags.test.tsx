import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Editor } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Flag } from '@shared/schemas';
import type { FetchLike } from '@/features/ai';
import { setViewportWidth } from '@/test/matchMedia';
import { getFlags } from './flags/flagsPlugin';
import {
  advancePastPause,
  FLAG,
  flagElementOrThrow,
  insertParagraph,
  PARAGRAPH,
  readyEditor,
  renderEditorPage,
} from './testing/editorHarness';
import { analyzeResponse, holdingFetch } from './testing/fakeAi';

const POPOVER_NAME = 'Writing flag';

// Writes a paragraph, waits out the pause and waits for the flag the fake AI returns.
async function editorWithFlag(flags: readonly Flag[] = [FLAG]): Promise<Editor> {
  const holder = renderEditorPage(() => Promise.resolve(analyzeResponse(flags)));
  const editor = await readyEditor(holder);
  insertParagraph(editor, PARAGRAPH);
  await advancePastPause();
  await waitFor(() => {
    expect(document.querySelector('.flag')).not.toBeNull();
  });
  return editor;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('flags in the editor', () => {
  // D4: a paragraph is analyzed once it has been still for the pause, and its flags appear.
  it('shows the flag returned for a paragraph after the pause (D4, D2)', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(analyzeResponse([FLAG])));
    const holder = renderEditorPage(fetchImpl);
    const editor = await readyEditor(holder);

    insertParagraph(editor, PARAGRAPH);
    await advancePastPause();

    await waitFor(() => {
      expect(flagElementOrThrow().textContent).toBe('moved');
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  // D1: On Demand mode asks the AI for nothing.
  it('makes no AI call in On Demand mode (D1)', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(analyzeResponse([FLAG])));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const holder = renderEditorPage(fetchImpl);
    const editor = await readyEditor(holder);

    await user.click(await screen.findByRole('button', { name: 'On Demand' }));
    insertParagraph(editor, PARAGRAPH);
    await advancePastPause();

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(document.querySelector('.flag')).toBeNull();
  });

  // D15: the raw Markdown view asks the AI for nothing.
  it('makes no AI call while the Markdown view is shown (D15)', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(analyzeResponse([FLAG])));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const holder = renderEditorPage(fetchImpl);
    const editor = await readyEditor(holder);

    await user.click(await screen.findByRole('button', { name: 'Markdown' }));
    insertParagraph(editor, PARAGRAPH);
    await advancePastPause();

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  // D2, D17: a click on a flag opens its popover with the reason, and Dismiss removes the flag.
  it('opens the reason on click and removes the flag on Dismiss (D2, D17)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await editorWithFlag();

    await user.click(flagElementOrThrow());
    const dialog = await screen.findByRole('dialog', { name: POPOVER_NAME });
    expect(within(dialog).getByText(FLAG.reason)).toBeTruthy();
    expect(within(dialog).getByText('Clarity')).toBeTruthy();

    await user.click(within(dialog).getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
      expect(document.querySelector('.flag')).toBeNull();
    });
    expect(screen.queryByRole('dialog', { name: POPOVER_NAME })).toBeNull();
  });

  // D17: Esc closes the popover and focus returns to the editor.
  it('closes on Escape and returns focus to the editor (D17)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await editorWithFlag();

    await user.click(flagElementOrThrow());
    await screen.findByRole('dialog', { name: POPOVER_NAME });
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: POPOVER_NAME })).toBeNull();
    });
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Document' }));
  });

  // D17: Enter opens the flag the caret is inside.
  it('opens the flag the caret is inside when Enter is pressed (D17)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const editor = await editorWithFlag();
    const [entry] = getFlags(editor.state);
    if (entry === undefined) {
      throw new Error('the flag is not in the editor state');
    }
    act(() => {
      editor.commands.setTextSelection(entry.from + 1);
      // The view is focused synchronously. commands.focus() defers it to an animation frame, so
      // the key events below would reach the page instead of the editor.
      editor.view.focus();
    });

    await user.keyboard('{Enter}');

    expect(await screen.findByRole('dialog', { name: POPOVER_NAME })).toBeTruthy();
  });

  // D17: Alt+F moves to the next flag and opens its popover, without a pointer.
  it('moves to the next flag and opens it with Alt+F (D17)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const editor = await editorWithFlag();
    const [entry] = getFlags(editor.state);
    act(() => {
      editor.view.focus();
    });

    await user.keyboard('{Alt>}f{/Alt}');

    const dialog = await screen.findByRole('dialog', { name: POPOVER_NAME });
    expect(within(dialog).getByText(FLAG.reason)).toBeTruthy();
    expect(editor.state.selection.from).toBe(entry?.from);
  });

  // D17: the Next Flag button exists only while a flag does, and opens the flag.
  it('shows the Next Flag button only while a flag exists and opens the flag (D17)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const holder = renderEditorPage(() => Promise.resolve(analyzeResponse([FLAG])));
    const editor = await readyEditor(holder);
    expect(screen.queryByRole('button', { name: 'Next Flag' })).toBeNull();

    insertParagraph(editor, PARAGRAPH);
    await advancePastPause();
    await user.click(await screen.findByRole('button', { name: 'Next Flag' }));

    const dialog = await screen.findByRole('dialog', { name: POPOVER_NAME });
    expect(within(dialog).getByText(FLAG.reason)).toBeTruthy();
  });

  // T10: a reason that is markup is shown as text and creates no element.
  it('renders a reason containing HTML as text (T10)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const hostile: Flag = { ...FLAG, reason: '<img src=x onerror=alert(1)> Check this' };
    await editorWithFlag([hostile]);

    await user.click(flagElementOrThrow());
    const dialog = await screen.findByRole('dialog', { name: POPOVER_NAME });

    expect(within(dialog).getByText(hostile.reason)).toBeTruthy();
    expect(dialog.querySelector('img')).toBeNull();
  });

  // S9: below md the same content opens as a bottom sheet.
  it('opens the flag in a bottom sheet below md (S9)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setViewportWidth(360);
    await editorWithFlag();

    await user.click(flagElementOrThrow());

    const sheet = await screen.findByRole('dialog', { name: POPOVER_NAME });
    expect(within(sheet).getByText(FLAG.reason)).toBeTruthy();
  });

  // D14: the status indicator sits in the top bar and reports a call that is in flight.
  it('shows AI is working in the top bar while a call is in flight (D14)', async () => {
    const pending = holdingFetch();
    const holder = renderEditorPage(pending.fetchImpl);
    const editor = await readyEditor(holder);

    insertParagraph(editor, PARAGRAPH);
    await advancePastPause();

    expect(await screen.findAllByText('AI is working')).not.toHaveLength(0);

    act(() => {
      pending.release([FLAG]);
    });
    await waitFor(() => {
      expect(screen.getAllByText('AI ready').length).toBeGreaterThan(0);
    });
    expect(document.querySelector('.flag')).not.toBeNull();
  });
});
