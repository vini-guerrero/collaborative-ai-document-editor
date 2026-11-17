import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react';
import type { ViewportBreakpoint } from '../../responsive/breakpoints';
import { useBreakpoint } from '../../responsive/useBreakpoint';
import { IconButton } from '../IconButton/IconButton';
import './AppShell.css';

export interface ShellState {
  // True while the sidebar is the icon rail (md).
  collapsed: boolean;
  // Called when the user chooses an item. Closes the drawer and leaves focus where the user
  // landed; does nothing outside drawer mode.
  closeDrawer: () => void;
}

export interface AppShellProps {
  navbar: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  // Accessible name of the sidebar landmark (S7).
  navLabel?: string;
}

// Outside an AppShell there is no drawer to close and the sidebar is always expanded.
function ignoreDrawerRequest(): void {
  return undefined;
}

const ShellContext = createContext<ShellState>({
  collapsed: false,
  closeDrawer: ignoreDrawerRequest,
});

export function useShell(): ShellState {
  return useContext(ShellContext);
}

type ShellMode = 'expanded' | 'rail' | 'drawer';

// S9: lg and up keep a persistent sidebar, md shows an icon rail, anything smaller uses a drawer.
function shellModeFor(breakpoint: ViewportBreakpoint): ShellMode {
  if (breakpoint === 'xl' || breakpoint === 'lg') {
    return 'expanded';
  }
  if (breakpoint === 'md') {
    return 'rail';
  }
  return 'drawer';
}

function firstFocusableIn(container: HTMLElement | null): HTMLElement | null {
  return (
    container?.querySelector<HTMLElement>('a[href], button:not([aria-disabled="true"])') ?? null
  );
}

// S9, S7: responsive page frame with a navbar header, a primary nav landmark and a main landmark.
// In drawer mode the drawer is the only interactive region while it is open: focus moves into it,
// the header and main become inert, and Esc, the backdrop or the close button dismiss it and
// return focus to the menu button. Choosing an item closes it without moving focus.
export function AppShell({
  navbar,
  sidebar,
  children,
  navLabel = 'Primary',
}: AppShellProps): JSX.Element {
  const mode = shellModeFor(useBreakpoint());
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Set once the user opens the drawer; the slide transition is enabled only after that, so a
  // resize never animates the sidebar.
  const [drawerToggled, setDrawerToggled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef(false);
  const menuButtonId = useId();
  const navId = useId();
  const isDrawerOpen = mode === 'drawer' && drawerOpen;

  // Leaving drawer mode closes the drawer, so it does not reopen on the next resize into it.
  if (mode !== 'drawer' && drawerOpen) {
    setDrawerOpen(false);
  }

  function openDrawer(): void {
    setDrawerToggled(true);
    setDrawerOpen(true);
  }

  // An item was chosen: the page the user chose is where focus belongs, not the menu button.
  function closeDrawer(): void {
    restoreFocusRef.current = false;
    setDrawerOpen(false);
  }

  // Esc, the backdrop and the close button: focus goes back to the menu button.
  function dismissDrawer(): void {
    restoreFocusRef.current = true;
    setDrawerOpen(false);
  }

  useEffect(() => {
    if (!isDrawerOpen) {
      return undefined;
    }
    firstFocusableIn(navRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return;
      }
      restoreFocusRef.current = true;
      setDrawerOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (restoreFocusRef.current) {
        restoreFocusRef.current = false;
        document.getElementById(menuButtonId)?.focus();
      }
    };
  }, [isDrawerOpen, menuButtonId]);

  return (
    <ShellContext.Provider value={{ collapsed: mode === 'rail', closeDrawer }}>
      <div
        className={`ds-app-shell ds-app-shell--${mode}`}
        data-animate={drawerToggled ? 'true' : undefined}
      >
        <header className="ds-app-shell__header" inert={isDrawerOpen}>
          {mode === 'drawer' ? (
            <IconButton
              id={menuButtonId}
              icon="menu"
              label="Open navigation"
              aria-expanded={isDrawerOpen}
              aria-controls={navId}
              onClick={() => {
                openDrawer();
              }}
            />
          ) : null}
          {navbar}
        </header>
        <nav
          id={navId}
          ref={navRef}
          aria-label={navLabel}
          className="ds-app-shell__sidebar"
          inert={mode === 'drawer' && !drawerOpen}
        >
          {mode === 'drawer' ? (
            <div className="ds-app-shell__drawer-head">
              <IconButton
                icon="x"
                label="Close navigation"
                onClick={() => {
                  dismissDrawer();
                }}
              />
            </div>
          ) : null}
          {sidebar}
        </nav>
        <main className="ds-app-shell__main" inert={isDrawerOpen}>
          {children}
        </main>
        {isDrawerOpen ? (
          <div
            className="ds-app-shell__backdrop"
            aria-hidden="true"
            data-testid="shell-backdrop"
            onClick={() => {
              dismissDrawer();
            }}
          />
        ) : null}
      </div>
    </ShellContext.Provider>
  );
}
