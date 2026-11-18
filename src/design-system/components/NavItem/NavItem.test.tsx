import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MouseEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NavItem } from './NavItem';

// S7, H2, H3: navigation items keep their meaning in every state.
describe('NavItem (S7, H2, H3)', () => {
  // H2: a link passes the click event to onClick, so a consumer can handle navigation in-app.
  it('passes the click event to onClick on a link and keeps the href', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn<(event: MouseEvent<HTMLElement>) => void>();
    render(<NavItem icon="file-text" label="Documents" href="/" onClick={onClick} />);

    const link = screen.getByRole('link', { name: 'Documents' });
    expect(link.getAttribute('href')).toBe('/');
    await user.click(link);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]?.[0]?.type).toBe('click');
  });

  // H2: a consumer that calls preventDefault in onClick stops the browser's own navigation.
  it('lets onClick prevent the link default action', () => {
    const onClick = vi.fn<(event: MouseEvent<HTMLElement>) => void>((event) => {
      event.preventDefault();
    });
    render(<NavItem icon="file-text" label="Documents" href="/" onClick={onClick} />);

    // fireEvent returns false when the default action was prevented.
    const proceeds = fireEvent.click(screen.getByRole('link', { name: 'Documents' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(proceeds).toBe(false);
  });

  it('marks the current link with aria-current', () => {
    render(<NavItem icon="file-text" label="Documents" href="/documents" current />);

    expect(screen.getByRole('link', { name: 'Documents' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('does not put aria-current on an action button', () => {
    render(<NavItem icon="plus" label="New Document" onClick={vi.fn()} current />);

    expect(screen.getByRole('button', { name: 'New Document' }).hasAttribute('aria-current')).toBe(
      false,
    );
  });

  it('renders a disabled soon item as an aria-disabled button with a Soon label', () => {
    render(<NavItem icon="users" label="Team" disabled soon />);

    const item = screen.getByRole('button', { name: /^Team/ });
    expect(item.getAttribute('aria-disabled')).toBe('true');
    expect(screen.queryByRole('link', { name: /Team/ })).toBeNull();
    expect(screen.getByText('Soon')).not.toBeNull();
  });

  it('does not run onClick for a disabled item', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<NavItem icon="users" label="Team" disabled soon onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: /^Team/ }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps the accessible name when collapsed', () => {
    render(<NavItem icon="file-text" label="Documents" href="/documents" collapsed />);

    expect(screen.getByRole('link', { name: 'Documents' })).not.toBeNull();
  });

  it('shows the label as a tooltip when collapsed, and none when expanded', () => {
    const { rerender } = render(
      <NavItem icon="file-text" label="Documents" href="/documents" collapsed />,
    );
    expect(screen.getByRole('tooltip').textContent).toBe('Documents');
    rerender(<NavItem icon="file-text" label="Documents" href="/documents" collapsed={false} />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('keeps Soon out of the visible label but in the name of a collapsed disabled item', () => {
    render(<NavItem icon="users" label="Team" disabled soon collapsed />);

    expect(screen.queryByText('Soon')).toBeNull();
    expect(screen.getByRole('button', { name: 'Team, coming soon' })).not.toBeNull();
  });

  it('runs the action with Enter from the keyboard', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<NavItem icon="plus" label="New Document" onClick={onClick} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('runs the action on click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<NavItem icon="plus" label="New Document" onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'New Document' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
