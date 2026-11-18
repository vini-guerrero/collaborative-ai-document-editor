# Product Direction: AI Co-Author Editor

Record of the product decisions made before development, for the editor described in `NEW - Chiri-Engineering-Assessment-AI-Document-Editor.pdf`. It covers how the editor and the home screen behave and what is in or out of scope. It does not cover stack or architecture.

**Guiding principle:** the user writes; the AI is a co-author that notices things, speaks up quietly, and never changes the document without a visible diff and an explicit accept.

## Decisions

**D1. Two modes, ambient by default.**
*Ambient* (default): AI discreetly flags passages. *On demand*: user invokes AI with a button on a selection or section. Toggle between them. No ghost-text or unprompted writing.

**D2. Flags are subtle underlines.**
A flagged phrase gets a dotted underline. Hover shows a one-line reason and a "View suggestion" button. Section-level restructuring belongs to On demand mode.

**D3. Four flag types.**
Clarity/wordiness, tone consistency, grammar/typos, and **questions to the author** (the AI asks for missing facts instead of inventing them; the author answers, then gets a rewrite). Flags are cheap; the replacement text is generated only on click.

**D4. Analysis runs when a paragraph is finished.**
Triggered on leaving an edited paragraph or after an idle pause (amended 2026-11-18: 5 s by default, set with `VITE_AI_IDLE_PAUSE_SECONDS`, 1-60). One paragraph per call, with heading and neighbors as context. Cached by content hash, capped flags per paragraph, never fires mid-typing.

**D5. Suggestion = anchored card + live inline preview.**
Grammarly-style card on the phrase (type, reason, Accept / Dismiss / Refine). While open, the text shows word-level tracked changes in place. Nothing is written until Accept. Same card for On demand mode.

**D6. Refine inside the card.**
Tone dropdown (Auto, Formal, Casual, Friendly, Confident, Neutral) + Length dropdown (Shorter, Longer, Same), combinable. Free input whose placeholder is a contextual suggestion. Step-back arrows (‹ 2/4 ›) between rounds. Instructions accumulate across rounds ("shorter", then "more formal" keeps both), and the diff is always shown against the original text. No chat thread.

**D7. History = collapsible timeline.**
A toolbar button opens a version timeline (each accepted change, labeled You or AI, with restore). Collapsed by default; expands only on user demand.

**D8. AI voice.**
Neutral, factual one-liners on edits ("Wordy: same meaning in 3 words"). Direct questions on author questions ("Which customers do you mean?"). No fake personality, no chat tone.

**D9. On demand entry points: three.**
1. Floating toolbar on selection (Rewrite / Fix tone / Shorten + instruction field).
2. "Improve section" button on headings (hover).
3. Slash menu, Notion-style: `/` opens the AI menu; pressing space or Esc closes it and keeps the `/` as plain text. Slash actions only work on existing text (rewrite paragraph, change tone, ask what's missing); nothing generates new content from nothing.

**D10. Restructure section (Phase 1).**
The brief asks for AI that can "restructure sections". Via the `/` menu, the user can ask the AI to **move, split, or merge** a section. Same rules as text edits: scoped to the chosen section, previewed in place, nothing applied until Accept.

**D11. Restructure preview.**
Same card and Accept / Dismiss / Refine. A moved section shows an accent bar at its new place and a dashed ghost at the old place.

**D12. Slash menu contents (Phase 1).**
The `/` menu (D9) offers the text actions plus **Restructure section**. It targets the block where the `/` was typed. With text selected, the floating toolbar (D9) is the entry point, so `/` never overwrites a selection. Space or Esc closes the menu and keeps the `/` as plain text.

**D13. First open: empty document with a Notion-style placeholder.**
A blank page with a placeholder hint such as "Write something, or press / for AI commands". No seed text. The AI appears once the user finishes a first paragraph (D4).

**D14. When the AI fails or runs out of credit.**
A small visible status indicator ("AI unavailable" / "Out of credit") and Ambient pauses itself. In the card: a spinner while generating, and "No changes suggested" if the AI returns the same text. The editor never breaks.

**D15. Raw Markdown toggle.**
A toggle, GitHub Gist style, switches between the visual document and the raw Markdown source. AI suggestions work in the visual view; the raw view is for reading and editing the source.

**D16. Flag density: few and confident.**
At most 2 flags per paragraph, only the ones that clearly matter, so each underline reads like a colleague's note and not a spell-checker.

**D17. Interaction rules.**
- Accepting a suggestion is a single Cmd+Z step.
- Editing the flagged text while its card is open closes the card and drops the flag.
- Keyboard: Tab accepts, Esc dismisses, and flags can be reached without hover.
- The document is saved in the browser and survives a reload.

## Left out on purpose

Ghost-text autocomplete, margin markers, side-by-side diff, multi-variant rewrites, chat thread, Cmd+K palette, "continue my idea", document-wide analysis, and all programmer-oriented functions (see Phase 2).

## Phase 2: future improvements

**Programmer functions** (outside the brief's scope, deferred): editing existing code blocks (fix, comment, explain, convert language), Markdown formatting fixes, inserting a new snippet from an instruction (would need an explicit exception to D9's "no content from nothing"), line-level diff previews for code, a code-aware toolbar, and `/` handling inside code blocks.

**Other:** document-wide analysis (repeated arguments, global tone drift), multi-variant rewrites, side-by-side diff, Cmd+K palette, per-flag-type settings and "don't flag this again".

# Home screen

The screen the app opens on, before the editor. These decisions are numbered H1 to H7 and are separate from the editor decisions (D1-D17); they build on D13 and D17.

## Decisions

**H1. The app opens on a home screen, not the editor.**
A micro file manager in the style of Google Drive: top navbar, left menu, and the user's documents in the main area. The editor opens only from there. Phase 1 has no auth and no real user; the app name "WebApp" is a placeholder.

**H2. Left menu: only New document works.**
Items: **New document** (enabled), **Documents** (the current screen, highlighted), and **Pinned**, **Collaborations**, **Archive** (visible but disabled). Disabled items are a visible promise of future features.

**H3. Navbar: name, disabled search, placeholder user.**
App name on the left, a search box that is visible but disabled, and a placeholder avatar on the right. No sign-in, no account menu.

**H4. Documents shown as grid or list.**
A toggle switches between **Grid** (default; cards with a text preview) and **List** (compact rows). Each item shows title, a short text preview (grid only), and "Edited 2 min ago", ordered by last edit. Clicking an item opens it in the editor. No AI-activity badges.

**H5. Basic document management: create, open, delete.**
Several documents are supported. **New document** opens a blank editor titled "Untitled document"; the user renames it in the editor's top bar (editing is just opening a document). A new document that was never written in is not kept. Each item has a delete action with a confirmation; deletion is permanent (Archive stays disabled). The browser persistence in D17 covers all documents.

**H6. Empty home: an invitation.**
With no documents, the home shows "Start your first document" with a New document button. No sample document, in line with D13: the first document the user sees is their own, starting blank with the placeholder.

**H7. Back to home.**
The editor's top bar has a back arrow and the app name, both leading to the home; the browser Back button does the same. Changes are saved as the user types (D17), so nothing is lost on leaving, and the home reflects the latest edit.

## Phase 2: future improvements

Working Search, Pinned, Collaborations and Archive with restore, rename or duplicate from the home list, sorting and filtering, folders, a remembered Grid/List choice, AI-activity badges on documents, and a real user menu with sign-in.
