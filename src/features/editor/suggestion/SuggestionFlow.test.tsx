import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Editor } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  advancePastPause,
  deferredResponse,
  flagElementOrThrow,
  flagFetch,
  FLAG,
  insertParagraph,
  PARAGRAPH,
  readyEditor,
  renderEditorPage,
  rewriteResponse,
} from '../testing/editorHarness';

const POPOVER_NAME = 'Writing flag';
const REPLACEMENT = 'pushed back';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

// Writes the paragraph, waits for its flag, and opens the flag's popover.
async function openFlag(
  rewrite: () => Promise<Response>,
): Promise<{ editor: Editor; user: ReturnType<typeof userEvent.setup> }> {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const holder = renderEditorPage(flagFetch(rewrite));
  const editor = await readyEditor(holder);
  insertParagraph(editor, PARAGRAPH);
  await advancePastPause();
  await waitFor(() => {
    expect(document.querySelector('.flag')).not.toBeNull();
  });
  await user.click(flagElementOrThrow());
  await screen.findByRole('dialog', { name: POPOVER_NAME });
  return { editor, user };
}

// Asks for the suggestion from the open flag popover.
async function viewSuggestion(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const dialog = screen.getByRole('dialog', { name: POPOVER_NAME });
  await user.click(within(dialog).getByRole('button', { name: 'View Suggestion' }));
}

describe('suggestion flow in the editor', () => {
  // D5, D17, T3: loading, then Accept applies the change once and drops the flag.
  it('shows loading, then Accept applies once and drops the flag (D5, D17)', async () => {
    const pending = deferredResponse();
    const { editor, user } = await openFlag(() => pending.promise);

    await viewSuggestion(user);
    expect(await screen.findByText('Writing a suggestion')).toBeTruthy();
    expect(editor.getText()).toContain('moved');

    act(() => {
      pending.resolve(rewriteResponse(REPLACEMENT));
    });
    await user.click(await screen.findByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(editor.getText()).toContain(REPLACEMENT);
    });
    expect(editor.getText()).not.toContain('moved');
    expect(document.querySelector('.flag')).toBeNull();

    // D17: one undo returns the original text.
    act(() => {
      editor.commands.undo();
    });
    expect(editor.getText()).toContain('moved');
    expect(editor.getText()).not.toContain(REPLACEMENT);
  });

  // D5: Dismiss closes the card and drops the flag; the text is untouched.
  it('Dismiss leaves the text untouched and removes the flag (D5)', async () => {
    const { editor, user } = await openFlag(() => Promise.resolve(rewriteResponse(REPLACEMENT)));
    await viewSuggestion(user);
    await screen.findByRole('button', { name: 'Accept' });
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
      expect(document.querySelector('.flag')).toBeNull();
    });
    expect(editor.getText()).toContain('moved');
    expect(document.querySelector('.suggestion-insert')).toBeNull();
  });

  // D17: Esc closes the card from anywhere in it; the flag stays and the text is untouched.
  it('Esc closes the card, keeps the flag and leaves the text untouched (D17)', async () => {
    const { editor, user } = await openFlag(() => Promise.resolve(rewriteResponse(REPLACEMENT)));
    await viewSuggestion(user);
    await screen.findByRole('button', { name: 'Accept' });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: POPOVER_NAME })).toBeNull();
    });
    expect(document.querySelector('.suggestion-delete')).toBeNull();
    expect(document.querySelector('.flag')).not.toBeNull();
    expect(editor.getText()).toContain('moved');
  });

  // D14: the AI says the same text, so the card says no changes were suggested.
  it('says No changes suggested when the AI returns the same text (D14)', async () => {
    const { user } = await openFlag(() => Promise.resolve(rewriteResponse(FLAG.quote)));
    await viewSuggestion(user);

    expect(await screen.findByText('No changes suggested')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  });

  // D14: out of credit shows the error state and the status indicator says so.
  it('shows the error state and out-of-credit status on a 402 (D14)', async () => {
    const { user } = await openFlag(() => Promise.resolve(new Response('{}', { status: 402 })));
    await viewSuggestion(user);

    expect(await screen.findByText('Your text is unchanged.')).toBeTruthy();
    expect(screen.getByText('The AI is out of credit.')).toBeTruthy();
    expect(await screen.findAllByText('AI Is Out of Credit')).not.toHaveLength(0);
  });

  // D17: Tab accepts only once the suggestion is ready, never while it is still loading.
  it('accepts with Tab only when the suggestion is ready (D17)', async () => {
    const pending = deferredResponse();
    const { editor, user } = await openFlag(() => pending.promise);
    await viewSuggestion(user);
    await screen.findByText('Writing a suggestion');

    await user.keyboard('{Tab}');
    expect(editor.getText()).toContain('moved');

    act(() => {
      pending.resolve(rewriteResponse(REPLACEMENT));
    });
    await screen.findByRole('button', { name: 'Accept' });
    // Tab accepts from the card itself (D17); a focused button moves focus normally.
    act(() => {
      document.querySelector<HTMLElement>('.suggestion-card')?.focus();
    });
    await user.keyboard('{Tab}');

    await waitFor(() => {
      expect(editor.getText()).toContain(REPLACEMENT);
    });
  });
});
