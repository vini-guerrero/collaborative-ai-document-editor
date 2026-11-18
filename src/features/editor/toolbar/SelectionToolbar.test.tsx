import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { type Box } from './toolbarPosition';
import { SelectionToolbar, type SelectionToolbarProps } from './SelectionToolbar';

const SELECTION: Box = { top: 300, left: 150, width: 120, height: 20 };
const SCREEN: Box = { top: 0, left: 0, width: 430, height: 800 };

function props(overrides: Partial<SelectionToolbarProps> = {}): SelectionToolbarProps {
  return {
    anchorRect: SELECTION,
    viewport: SCREEN,
    onRewrite: vi.fn(),
    onFixTone: vi.fn(),
    onShorten: vi.fn(),
    onInstruction: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
}

describe('SelectionToolbar', () => {
  it('renders nothing without a selection', () => {
    render(<SelectionToolbar {...props({ anchorRect: null })} />);
    expect(screen.queryByRole('group', { name: 'Selection actions' })).toBeNull();
  });

  it('reports each action button', async () => {
    const user = userEvent.setup();
    const onRewrite = vi.fn();
    const onFixTone = vi.fn();
    const onShorten = vi.fn();
    render(<SelectionToolbar {...props({ onRewrite, onFixTone, onShorten })} />);
    await user.click(screen.getByRole('button', { name: 'Rewrite' }));
    await user.click(screen.getByRole('button', { name: 'Fix Tone' }));
    await user.click(screen.getByRole('button', { name: 'Shorten' }));
    expect(onRewrite).toHaveBeenCalledTimes(1);
    expect(onFixTone).toHaveBeenCalledTimes(1);
    expect(onShorten).toHaveBeenCalledTimes(1);
  });

  it('submits a trimmed instruction and clears the field', async () => {
    const user = userEvent.setup();
    const onInstruction = vi.fn();
    render(<SelectionToolbar {...props({ onInstruction })} />);
    const field = screen.getByRole('textbox', { name: 'Instruction' });
    const apply = screen.getByRole('button', { name: 'Apply' });
    expect(apply.hasAttribute('disabled')).toBe(true);
    await user.type(field, '  make it warmer  {Enter}');
    expect(onInstruction).toHaveBeenCalledWith('make it warmer');
    expect(field).toHaveProperty('value', '');
  });

  it('dismisses on Escape', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<SelectionToolbar {...props({ onDismiss })} />);
    // Mouse presses keep the editor focused (the toolbar prevents focus moves), so focus the button
    // the way Tab does before pressing Escape.
    await user.tab();
    await user.keyboard('{Escape}');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('is reachable by Tab, so the keyboard path does not need a pointer', async () => {
    const user = userEvent.setup();
    render(<SelectionToolbar {...props()} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rewrite' }));
  });
});
