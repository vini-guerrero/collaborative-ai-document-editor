import type { ReactElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentSummary } from '@/features/documents';
import { DocumentCard } from './DocumentCard';
import { DocumentGrid } from './DocumentGrid';
import { DocumentList } from './DocumentList';
import { ViewToggle, type DocumentView } from './ViewToggle';

const NOW = 1_000_000_000_000;
const MS_PER_MINUTE = 60_000;

const DRAFT: DocumentSummary = {
  id: 'doc-draft',
  title: 'Résumé draft 🚀',
  preview: 'Café notes, naïve plans',
  updatedAt: NOW - 2 * MS_PER_MINUTE,
};
const LONG: DocumentSummary = {
  id: 'doc-long',
  title: 'x'.repeat(200),
  preview: '',
  updatedAt: NOW,
};
const BLANK: DocumentSummary = { id: 'doc-blank', title: '   ', preview: '', updatedAt: NOW };

function renderInRouter(children: ReactElement): ReturnType<typeof render> {
  return render(<MemoryRouter>{children}</MemoryRouter>);
}

function linkTexts(): (string | null)[] {
  return screen.getAllByRole('link').map((link) => link.textContent);
}

describe('ViewToggle', () => {
  // H4: Grid and List are pressed-state buttons; the group names the control (S7).
  it('reflects the current view with aria-pressed and reports the chosen view (H4, S7)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(view: DocumentView) => void>();
    render(<ViewToggle value="grid" onChange={onChange} />);

    const group = screen.getByRole('group', { name: 'Document view' });
    expect(within(group).getByRole('button', { name: 'Grid' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    await user.click(within(group).getByRole('button', { name: 'List' }));

    expect(onChange).toHaveBeenCalledWith('list');
  });
});

describe('DocumentCard', () => {
  // H4: title, preview and "Edited x ago" with an injected clock; the title is the link.
  it('renders title, preview and relative edit time for the injected now (H4)', () => {
    renderInRouter(
      <ul>
        <DocumentCard doc={DRAFT} now={NOW} />
      </ul>,
    );

    const heading = screen.getByRole('heading', { level: 2, name: 'Résumé draft 🚀' });
    expect(within(heading).getByRole('link').getAttribute('href')).toBe('/documents/doc-draft');
    expect(screen.getByText('Café notes, naïve plans')).toBeTruthy();
    expect(screen.getByText('Edited 2 minutes ago')).toBeTruthy();
  });

  // H4: a blank title falls back to the untitled name, as in the editor (H5).
  it('names a blank title as Untitled document (H4, H5)', () => {
    renderInRouter(
      <ul>
        <DocumentCard doc={BLANK} now={NOW} />
      </ul>,
    );

    expect(screen.getByRole('link', { name: 'Untitled document' })).toBeTruthy();
  });
});

describe('DocumentGrid', () => {
  // H4: each card is a link to its editor route, in the order given.
  it('renders one link per document in array order, each to its editor route (H4)', () => {
    renderInRouter(<DocumentGrid documents={[DRAFT, BLANK, LONG]} now={NOW} />);

    expect(linkTexts()).toEqual(['Résumé draft 🚀', 'Untitled document', 'x'.repeat(200)]);
    expect(screen.getByRole('link', { name: 'Résumé draft 🚀' }).getAttribute('href')).toBe(
      '/documents/doc-draft',
    );
    expect(screen.getByRole('link', { name: 'x'.repeat(200) }).getAttribute('href')).toBe(
      '/documents/doc-long',
    );
  });

  // H4 key stability: a reordered array keeps each title paired with its own link (stable ids).
  it('keeps each title paired with its link after a reorder (H4)', () => {
    const { rerender } = renderInRouter(<DocumentGrid documents={[DRAFT, LONG]} now={NOW} />);

    rerender(
      <MemoryRouter>
        <DocumentGrid documents={[LONG, DRAFT]} now={NOW} />
      </MemoryRouter>,
    );

    expect(linkTexts()).toEqual(['x'.repeat(200), 'Résumé draft 🚀']);
    expect(screen.getByRole('link', { name: 'Résumé draft 🚀' }).getAttribute('href')).toBe(
      '/documents/doc-draft',
    );
  });
});

describe('DocumentList', () => {
  // H4: the list view keeps the links, the edit time and the order of the grid.
  it('keeps links and edit times in the compact rows, in array order (H4)', () => {
    renderInRouter(<DocumentList documents={[DRAFT, BLANK]} now={NOW} />);

    expect(screen.getByTestId('document-list')).toBeTruthy();
    expect(linkTexts()).toEqual(['Résumé draft 🚀', 'Untitled document']);
    expect(screen.getByRole('link', { name: 'Résumé draft 🚀' }).getAttribute('href')).toBe(
      '/documents/doc-draft',
    );
    expect(screen.getByText('Edited 2 minutes ago')).toBeTruthy();
    expect(screen.getByText('Edited now')).toBeTruthy();
  });

  // H4 key stability: rows survive a reorder with their own title and link.
  it('keeps each title paired with its link after a reorder (H4)', () => {
    const { rerender } = renderInRouter(<DocumentList documents={[DRAFT, LONG]} now={NOW} />);

    rerender(
      <MemoryRouter>
        <DocumentList documents={[LONG, DRAFT]} now={NOW} />
      </MemoryRouter>,
    );

    expect(linkTexts()).toEqual(['x'.repeat(200), 'Résumé draft 🚀']);
    expect(screen.getByRole('link', { name: 'Résumé draft 🚀' }).getAttribute('href')).toBe(
      '/documents/doc-draft',
    );
  });
});
