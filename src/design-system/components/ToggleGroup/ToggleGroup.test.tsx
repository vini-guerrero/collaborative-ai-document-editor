import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToggleGroup, type ToggleGroupOption } from './ToggleGroup';

const VIEW_OPTIONS: readonly ToggleGroupOption[] = [
  { value: 'grid', label: 'Grid', icon: 'layout-grid' },
  { value: 'list', label: 'List', icon: 'list' },
];

// S4 and S7: a labelled group of toggle buttons whose pressed state follows the value.
describe('ToggleGroup (S4, S7)', () => {
  it('names the group with its label', () => {
    render(<ToggleGroup label="View" value="grid" onChange={vi.fn()} options={VIEW_OPTIONS} />);

    expect(screen.getByRole('group', { name: 'View' })).not.toBeNull();
  });

  it('reflects the value in aria-pressed (S7)', () => {
    render(<ToggleGroup label="View" value="grid" onChange={vi.fn()} options={VIEW_OPTIONS} />);

    expect(screen.getByRole('button', { name: 'Grid' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onChange with the option value when an option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ToggleGroup label="View" value="grid" onChange={onChange} options={VIEW_OPTIONS} />);

    await user.click(screen.getByRole('button', { name: 'List' }));

    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('keeps every option named when iconOnly is set (S7)', () => {
    render(
      <ToggleGroup label="View" value="grid" onChange={vi.fn()} options={VIEW_OPTIONS} iconOnly />,
    );

    expect(screen.getByRole('button', { name: 'Grid' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'List' })).not.toBeNull();
  });
});
