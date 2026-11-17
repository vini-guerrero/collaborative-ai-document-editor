import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type JSX } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TYPEAHEAD_RESET_MS } from '../list/listKeyboard';
import { Select, type SelectOption } from './Select';

const LABEL = 'Tone';
const NEXT_CONTROL = 'Next control';

const OPTIONS: readonly SelectOption[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal', label: 'Formal' },
  { value: 'neutral', label: 'Neutral' },
];

function renderSelect(value = 'friendly', onChange = vi.fn(), options = OPTIONS): void {
  render(
    <>
      <Select label={LABEL} value={value} onChange={onChange} options={options} />
      <button type="button">{NEXT_CONTROL}</button>
    </>,
  );
}

// The value lives in state, so a choice is visible in the trigger the way the app will see it.
function StatefulSelect({ onChange }: { onChange: (value: string) => void }): JSX.Element {
  const [value, setValue] = useState('friendly');
  return (
    <>
      <Select
        label={LABEL}
        value={value}
        options={OPTIONS}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
      <button type="button">{NEXT_CONTROL}</button>
    </>
  );
}

function trigger(): HTMLElement {
  return screen.getByRole('button', { name: /^Tone(:|$)/ });
}

function option(name: string): HTMLElement {
  return screen.getByRole('option', { name });
}

afterEach(() => {
  vi.useRealTimers();
});

// D6, S5, S9: a single-choice dropdown with the same keyboard model as Menu.
describe('Select (D6, S5, S9)', () => {
  it('shows the label of the selected option in the trigger', () => {
    renderSelect('formal');

    expect(trigger().textContent).toBe('Formal');
    expect(trigger().getAttribute('aria-label')).toBe('Tone: Formal');
  });

  it('shows the label as placeholder and marks no option when the value matches none', async () => {
    const user = userEvent.setup();
    renderSelect('unknown');

    expect(trigger().textContent).toBe(LABEL);
    expect(trigger().getAttribute('aria-label')).toBe(LABEL);

    await user.click(trigger());

    for (const name of ['Friendly', 'Formal', 'Neutral']) {
      expect(option(name).getAttribute('aria-selected')).toBe('false');
    }
    // The first enabled option is still reachable: opening focuses it.
    expect(document.activeElement).toBe(option('Friendly'));
  });

  it('shows a custom placeholder while the value matches no option', () => {
    render(
      <Select
        label={LABEL}
        placeholder="Choose a tone"
        value="unknown"
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );

    expect(trigger().textContent).toBe('Choose a tone');
  });

  it('exposes aria-haspopup and aria-expanded on the trigger (S7)', async () => {
    const user = userEvent.setup();
    renderSelect();

    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    await user.click(trigger());

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('listbox', { name: LABEL })).not.toBeNull();
  });

  it('marks the selected option with aria-selected and focuses it on open', async () => {
    const user = userEvent.setup();
    renderSelect('formal');

    await user.click(trigger());

    expect(option('Formal').getAttribute('aria-selected')).toBe('true');
    expect(option('Friendly').getAttribute('aria-selected')).toBe('false');
    expect(document.activeElement).toBe(option('Formal'));
  });

  it('opens with ArrowDown and ArrowUp from the trigger', async () => {
    const user = userEvent.setup();
    renderSelect('friendly');

    trigger().focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(option('Friendly'));

    await user.keyboard('{Escape}');
    trigger().focus();
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(option('Neutral'));
  });

  it('moves with the arrows, wrapping at both ends, and with Home and End', async () => {
    const user = userEvent.setup();
    renderSelect('friendly');
    await user.click(trigger());

    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(option('Neutral'));

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(option('Friendly'));

    await user.keyboard('{End}');
    expect(document.activeElement).toBe(option('Neutral'));

    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(option('Friendly'));
  });

  it('chooses the focused option with Enter, closes, and returns focus to trigger', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderSelect('friendly', onChange);
    await user.click(trigger());
    await user.keyboard('{ArrowDown}');

    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith('formal');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('chooses the focused option with Space', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderSelect('friendly', onChange);
    await user.click(trigger());
    await user.keyboard('{ArrowDown}');

    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith('formal');
  });

  it('closes on Escape without changing the value, and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderSelect('friendly', onChange);
    await user.click(trigger());

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes on Tab and moves focus to the next control', async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(trigger());

    await user.keyboard('{Tab}');

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: NEXT_CONTROL }));
  });

  it('changes the value on click, closes, and shows the new label', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulSelect onChange={onChange} />);
    await user.click(trigger());

    await user.click(option('Neutral'));

    expect(onChange).toHaveBeenCalledWith('neutral');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger().textContent).toBe('Neutral');
  });

  it('skips disabled options and never chooses them', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderSelect('friendly', onChange, [
      { value: 'friendly', label: 'Friendly' },
      { value: 'formal', label: 'Formal', disabled: true },
      { value: 'neutral', label: 'Neutral' },
    ]);
    await user.click(trigger());

    expect(option('Formal').getAttribute('aria-disabled')).toBe('true');

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(option('Neutral'));

    await user.click(option('Formal'));
    expect(onChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(option('Neutral'));
    expect(screen.getByRole('listbox', { name: LABEL })).not.toBeNull();
  });

  // S9: a typed letter jumps to the next matching option; a pause restarts the search.
  it('jumps to a matching option with type-ahead and restarts after the reset delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSelect('friendly');
    await user.click(trigger());

    await user.keyboard('n');
    expect(document.activeElement).toBe(option('Neutral'));

    act(() => {
      vi.advanceTimersByTime(TYPEAHEAD_RESET_MS + 1);
    });
    // A fresh "f" searches from Neutral and wraps to Friendly, the first option starting with "f".
    // Without the reset the query would be "nf", match nothing, and focus would stay on Neutral.
    await user.keyboard('f');

    expect(document.activeElement).toBe(option('Friendly'));
  });
});
