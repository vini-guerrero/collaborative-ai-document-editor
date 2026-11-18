import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RefineControls, type RefineControlsProps } from './RefineControls';

// D6: the controls report choices through callbacks and hold no request logic.
function props(overrides: Partial<RefineControlsProps> = {}): RefineControlsProps {
  return {
    tone: 'auto',
    length: 'same',
    roundLabel: '2 / 3',
    canStepBack: true,
    canStepForward: false,
    instructionBudget: 200,
    busy: false,
    onToneChange: vi.fn(),
    onLengthChange: vi.fn(),
    onInstruction: vi.fn(),
    onStepBack: vi.fn(),
    onStepForward: vi.fn(),
    ...overrides,
  };
}

describe('RefineControls', () => {
  it('shows the tone and length dropdowns with their current values', () => {
    render(<RefineControls {...props({ tone: 'formal', length: 'shorter' })} />);
    expect(screen.getByRole('button', { name: 'Tone: Formal' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Length: Shorter' })).toBeTruthy();
  });

  it('reports a tone chosen from the dropdown', async () => {
    const user = userEvent.setup();
    const onToneChange = vi.fn();
    render(<RefineControls {...props({ onToneChange })} />);
    await user.click(screen.getByRole('button', { name: 'Tone: Auto' }));
    await user.click(screen.getByRole('option', { name: 'Casual' }));
    expect(onToneChange).toHaveBeenCalledWith('casual');
  });

  it('reports a length chosen from the dropdown', async () => {
    const user = userEvent.setup();
    const onLengthChange = vi.fn();
    render(<RefineControls {...props({ onLengthChange })} />);
    await user.click(screen.getByRole('button', { name: 'Length: Same length' }));
    await user.click(screen.getByRole('option', { name: 'Longer' }));
    expect(onLengthChange).toHaveBeenCalledWith('longer');
  });

  it('keeps Refine disabled until the instruction has text', async () => {
    const user = userEvent.setup();
    const onInstruction = vi.fn();
    render(<RefineControls {...props({ onInstruction })} />);
    const refine = screen.getByRole('button', { name: 'Refine' });
    expect(refine.hasAttribute('disabled')).toBe(true);
    await user.type(screen.getByRole('textbox', { name: 'Refine instruction' }), '  less formal  ');
    expect(refine.hasAttribute('disabled')).toBe(false);
    await user.click(refine);
    expect(onInstruction).toHaveBeenCalledWith('less formal');
    expect(screen.getByRole('textbox', { name: 'Refine instruction' })).toHaveProperty('value', '');
  });

  it('uses a tone hint at the same length and a length hint otherwise', () => {
    const { rerender } = render(<RefineControls {...props()} />);
    expect(screen.getByPlaceholderText('Try: make it sound less corporate')).toBeTruthy();
    rerender(<RefineControls {...props({ length: 'shorter' })} />);
    expect(screen.getByPlaceholderText('Try: lead with the main point')).toBeTruthy();
  });

  it('disables Refine while a request is in flight', async () => {
    const user = userEvent.setup();
    render(<RefineControls {...props({ busy: true })} />);
    await user.type(screen.getByRole('textbox', { name: 'Refine instruction' }), 'brief');
    expect(screen.getByRole('button', { name: 'Refine' }).hasAttribute('disabled')).toBe(true);
  });

  it('shows the round counter and steps back and forward', async () => {
    const user = userEvent.setup();
    const onStepBack = vi.fn();
    const onStepForward = vi.fn();
    render(<RefineControls {...props({ onStepBack, onStepForward })} />);
    expect(screen.getByText('2 / 3')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onStepBack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(true);
    expect(onStepForward).not.toHaveBeenCalled();
  });
});
