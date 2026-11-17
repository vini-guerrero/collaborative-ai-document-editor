import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { setViewportWidth } from '../../../test/matchMedia';
import { NavItem } from '../NavItem/NavItem';
import { AppShell } from './AppShell';

function renderShell(): void {
  render(
    <AppShell
      navbar={<span>Chiri</span>}
      sidebar={
        <>
          <NavItem icon="file-text" label="Documents" href="#documents" current />
          <NavItem icon="users" label="Team" disabled soon />
        </>
      }
    >
      <p>Page content</p>
    </AppShell>,
  );
}

// S9: expanded sidebar at lg, icon rail at md, drawer below md. S7: focus moves in, Esc and
// focus return, and the drawer is the only interactive region while open.
describe('AppShell (S9, S7)', () => {
  beforeEach(() => {
    setViewportWidth(1280);
  });

  it('shows the sidebar without a menu button at 1200 pixels', () => {
    setViewportWidth(1200);
    renderShell();

    expect(screen.getByRole('navigation', { name: 'Primary' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Open navigation' })).toBeNull();
  });

  it('renders the icon rail at 800 pixels with labels still accessible', () => {
    setViewportWidth(800);
    renderShell();

    expect(screen.queryByRole('button', { name: 'Open navigation' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Documents' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Team, coming soon' })).not.toBeNull();
  });

  it('exposes header, navigation and main landmarks', () => {
    renderShell();

    expect(screen.getByRole('banner')).not.toBeNull();
    expect(screen.getByRole('navigation', { name: 'Primary' })).not.toBeNull();
    expect(screen.getByRole('main')).not.toBeNull();
  });

  it('opens the drawer from the menu button at 360 pixels and closes it with Escape', async () => {
    const user = userEvent.setup();
    setViewportWidth(360);
    renderShell();
    const menuButton = screen.getByRole('button', { name: 'Open navigation' });
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav.hasAttribute('inert')).toBe(true);

    await user.click(menuButton);

    expect(nav.hasAttribute('inert')).toBe(false);
    expect(within(nav).getByRole('link', { name: 'Documents' })).not.toBeNull();

    await user.keyboard('{Escape}');

    expect(nav.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(menuButton);
  });

  it('moves focus into the drawer and makes header and main inert while open', async () => {
    const user = userEvent.setup();
    setViewportWidth(360);
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const header = screen.getByRole('banner');
    const main = screen.getByRole('main');

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));

    expect(nav.contains(document.activeElement)).toBe(true);
    expect(header.hasAttribute('inert')).toBe(true);
    expect(main.hasAttribute('inert')).toBe(true);
  });

  it('closes with the Close navigation button and returns focus to the menu button', async () => {
    const user = userEvent.setup();
    setViewportWidth(360);
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const menuButton = screen.getByRole('button', { name: 'Open navigation' });

    await user.click(menuButton);
    await user.click(screen.getByRole('button', { name: 'Close navigation' }));

    expect(nav.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(menuButton);
  });

  it('closes the drawer when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    setViewportWidth(360);
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Primary' });

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    await user.click(screen.getByTestId('shell-backdrop'));

    expect(nav.hasAttribute('inert')).toBe(true);
  });

  it('closes after an item is chosen and leaves focus off the menu button', async () => {
    const user = userEvent.setup();
    setViewportWidth(360);
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const menuButton = screen.getByRole('button', { name: 'Open navigation' });

    await user.click(menuButton);
    await user.click(screen.getByRole('link', { name: 'Documents' }));

    expect(nav.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).not.toBe(menuButton);
  });

  it('ignores Escape when an earlier handler already prevented it', async () => {
    const user = userEvent.setup();
    const preventEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
      }
    };
    document.addEventListener('keydown', preventEscape);
    setViewportWidth(360);
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Primary' });

    try {
      await user.click(screen.getByRole('button', { name: 'Open navigation' }));
      await user.keyboard('{Escape}');

      expect(nav.hasAttribute('inert')).toBe(false);
    } finally {
      document.removeEventListener('keydown', preventEscape);
    }
  });

  it('closes the drawer when the viewport grows to lg while open', async () => {
    const user = userEvent.setup();
    setViewportWidth(360);
    renderShell();
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));

    act(() => {
      setViewportWidth(1100);
    });

    expect(screen.queryByRole('button', { name: 'Open navigation' })).toBeNull();
    expect(screen.queryByTestId('shell-backdrop')).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Primary' }).hasAttribute('inert')).toBe(false);
  });
});
