# Vendored Atlassian Design System tokens

- Source package: `@atlaskit/tokens` 20.12.0 (Apache-2.0, see `LICENSE`), fetched from the npm registry on 2026-11-17.
- Files: the CSS string of each theme module in `dist/esm/artifacts/themes/` (`atlassian-light`, `atlassian-dark`, `atlassian-spacing`, `atlassian-typography`, `atlassian-shape`, `atlassian-motion`), written out unmodified as `.css`.
- No remote `@import`, `url()` or http reference in any file (checked).
- Activation: selectors match `html[data-color-mode=...][data-theme~="light:light dark:dark ..."]`; `src/design-system/theme.ts` sets those attributes.
- Updating: a deliberate, dated change (S8 re-check). Do not edit these files by hand.
