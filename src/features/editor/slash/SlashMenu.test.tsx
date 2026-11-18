import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SLASH_ITEMS } from './slashItems';
import { SlashMenu } from './SlashMenu';

const POSITION = { top: 40, left: 16 };

describe('SlashMenu', () => {
  it('renders each item as an option in a listbox', () => {
    render(
      <SlashMenu items={SLASH_ITEMS} activeIndex={0} position={POSITION} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole('listbox', { name: 'AI commands' })).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByRole('option', { name: /Change tone/ })).toBeTruthy();
  });

  // D12: items that are not built yet say so and are marked unavailable (H2, H3).
  it('marks unbuilt items as Soon and unavailable', () => {
    render(
      <SlashMenu items={SLASH_ITEMS} activeIndex={0} position={POSITION} onSelect={vi.fn()} />,
    );
    const askMissing = screen.getByRole('option', { name: /Ask what's missing/ });
    expect(askMissing.getAttribute('aria-disabled')).toBe('true');
    expect(askMissing.textContent).toContain('Soon');
  });

  it('marks only the active item as selected', () => {
    render(
      <SlashMenu items={SLASH_ITEMS} activeIndex={2} position={POSITION} onSelect={vi.fn()} />,
    );
    const selected = screen
      .getAllByRole('option')
      .filter((option) => option.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]?.textContent).toContain("Ask what's missing");
  });

  it('reports the item that was clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SlashMenu items={SLASH_ITEMS} activeIndex={0} position={POSITION} onSelect={onSelect} />,
    );
    await user.click(screen.getByRole('option', { name: /Restructure section/ }));
    expect(onSelect).toHaveBeenCalledWith(SLASH_ITEMS[3]);
  });

  it('renders nothing when the filter matches no item', () => {
    const { container } = render(
      <SlashMenu items={[]} activeIndex={0} position={null} onSelect={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });
});
