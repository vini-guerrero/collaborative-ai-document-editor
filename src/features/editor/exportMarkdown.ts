const DEFAULT_NAME = 'untitled-document';
const MAX_NAME_CHARS = 80;
const REVOKE_DELAY_MS = 1_000;

// A file name from the document title: lowercase words joined by hyphens, no characters a file
// system rejects, never empty. Non-Latin letters are kept.
export function markdownFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_NAME_CHARS)
    .replace(/-+$/g, '');
  return `${slug === '' ? DEFAULT_NAME : slug}.md`;
}

// Saves the text as a file through the browser's download. The object URL is released on the next
// task, because some browsers cancel the download if it is revoked during the click.
export function downloadMarkdown(filename: string, markdown: string): void {
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, REVOKE_DELAY_MS);
}
