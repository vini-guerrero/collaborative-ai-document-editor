# UI/UX Rules

Priority: user instruction > repo conventions > this file. `Never` = hard rule.
Platform-agnostic: web, desktop, mobile. Use the product's design system and components first. On native platforms follow the platform guidelines before inventing a pattern.

## Checks
- Done only when every screen has been looked at rendered (screenshot or device), not only read as code.
- Each screen works by keyboard alone, with a screen reader, at 200% text size, at the smallest supported width, and in light and dark themes.
- An automated accessibility check is clean. Contrast meets WCAG AA.
- Every data view implements loading, empty, error, and success states.

## UX
How users think, decide and succeed: research, flows, heuristics.

### Method
- Start from the user's task: who, what goal, what counts as success. Design the task flow before the screen.
- Evidence ranks: user research and usage data, then established heuristics, then platform conventions, then opinion. Never claim what users want without evidence; mark assumptions that need user validation.
- Before done, run a heuristic evaluation (Nielsen's ten, below) and a cognitive walkthrough of the primary task: at each step, does the user know what to do, see how, and understand the result?
- Humans validate with usability tests of about five users per round, then iterate.
- Measure key tasks: completion rate, time on task, error rate. Product level: HEART. Perceived usability: SUS. Instrument the events.
- Uncertain changes ship as an A/B test behind a flag, with the metric chosen in advance.

### Usability Heuristics (Nielsen)
- Visibility of system status: feedback within 100 ms; over 1 s show progress; over 10 s show progress with cancel.
- Match the real world: the user's words and concepts. Never internal jargon.
- User control and freedom: undo, cancel, back, and a clear exit from every flow.
- Consistency and standards: the same thing looks and behaves the same everywhere. Reuse components; never restyle one-off.
- Error prevention: constraints and good defaults beat error messages. Destructive actions are undoable or confirmed.
- Recognition over recall: show options, history, and context. Never make the user remember across screens.
- Flexibility and efficiency: shortcuts, bulk actions, and saved defaults for experts, invisible to novices.
- Aesthetic and minimalist design: one primary action per screen; remove what does not serve the task.
- Help users recover from errors: say what happened and how to fix it, keep their input, offer retry. Never raw error codes or blame.
- Help and documentation: in context, searchable, task-focused.

### Laws and Effects
- Jakob's law: users expect your product to work like the ones they already know. Use familiar patterns.
- Fitts's law: primary and frequent targets are large and close to the pointer or thumb; destructive ones sit apart.
- Hick's law: fewer choices per step, a recommended default, progressive disclosure for advanced options.
- Miller's law: short-term memory holds only a few items. Chunk content into small groups; never make the user hold information in mind.
- Tesler's law: complexity that cannot be removed is absorbed by the system, not pushed to the user.
- Postel's law: accept loosely formatted input; be strict in what you show and store.
- Doherty threshold: keep interaction responses under 400 ms.
- Gestalt: proximity, similarity, common region, and alignment express grouping. Whitespace separates groups.
- Von Restorff effect: only the primary action is visually distinct.
- Serial position effect: the most important items go first or last in a list or menu.
- Peak-end rule: polish the hardest moment and the final step of a flow.
- Goal-gradient effect: show progress in multi-step tasks.
- Aesthetic-usability effect: polish raises tolerance for flaws; it never replaces usability testing.
- Norman's principles: signifiers show what is interactive, mappings are natural, constraints block wrong actions.

## UI
How the interface looks, behaves and is built.

### Layout
- Hierarchy comes from size, weight, and spacing before color.
- Spacing, sizes, and radii come from the token scale. Never arbitrary pixel values.
- Responsive from the smallest width up. No horizontal scrolling at 320 CSS px.
- Body line length 45 to 75 characters.
- Touch targets at least 44 by 44 pt (48 dp), with space between them.
- Reserve space for images and async content so the layout never shifts. Skeletons match the final layout.
- Respect safe areas. The on-screen keyboard never covers the focused field.
- Design with real and extreme content: long names, empty lists, huge numbers, translated text 40% longer, right-to-left.

### Typography and Color
- Type sizes from the scale, at most two families, body at least 16 px on the web. Relative units so user font settings apply.
- Tabular figures and right alignment for numeric columns.
- Components use semantic color tokens (`text-primary`, `surface`, `danger`), never raw hex. Dark mode comes from tokens, not inversion.
- Contrast: 4.5:1 for text; 3:1 for large text, UI components, and focus indicators.
- Never color alone to carry meaning. Pair it with text, an icon, or a pattern.
- Hover, focus, active, selected, disabled, and error states are visibly distinct.

### Components and Interaction
- Buttons act; links navigate. Button labels are verbs naming the outcome ("Save changes", never "OK").
- Destructive actions are visually separate from the primary action and name the object ("Delete project Alpha").
- Loading: skeletons for content, spinners for short waits, progress bars for long ones. Never freeze the interface. Block double submission.
- Empty states say what belongs here and offer the first action.
- Modals are rare: focus is trapped, `Esc` closes, focus returns to the trigger. Never stacked, never on page load.
- Toasts are for non-critical confirmations, never the only place an error or required action appears.
- Navigation shows where the user is. Back works. URLs or deep links restore the view, including filters and scroll position.
- Tables and lists provide sort, filter, and pagination or virtualization, with a small-screen strategy.
- Search is debounced, shows the query and result count, and guides on no results.
- Disabled controls explain why, or stay enabled and validate on use.

### Forms
- Every field has a visible label above it. A placeholder is never the label.
- Ask only for what is needed. Mark optional fields. One column.
- Correct input type, keyboard, and `autocomplete`.
- Validate on blur and on submit, not on each keystroke. Messages sit next to the field and say how to fix it.
- On submit failure focus the first error and keep every value.
- Never block paste. Offer show-password. State password rules up front.
- Long forms autosave or warn before unsaved changes are lost.
- Multi-step flows allow going back without loss and end with a review.

### Accessibility
- WCAG level AA is the bar: perceivable, operable, understandable, robust.
- Native elements first. ARIA only to fill gaps, with correct role, name, and state.
- Everything is operable by keyboard in a logical order with a visible focus indicator. No keyboard traps. Never remove the focus outline without a replacement.
- Icon-only controls have accessible names. Meaningful images have alt text; decorative ones have empty alt.
- Headings are hierarchical. Landmarks mark regions. Async updates are announced through live regions.
- Form errors are programmatically tied to their fields.
- After navigation or a dynamic view change, move focus to the new content.
- Respect reduced-motion and high-contrast settings. Nothing flashes more than three times a second.
- Content reflows at 200% zoom. Orientation is not locked. Hover-only content is also reachable by focus and touch.
- Media has captions. Time limits can be extended.
- Test with a keyboard and a screen reader; automated tools find only part of the problems.

### Motion
- Motion explains cause and effect. UI transitions take 150 to 300 ms and never block input.
- Animate transform and opacity only.

### Content
- Users scan, they do not read: front-load headings and first words, one idea per paragraph, lists for steps.
- Plain language, sentence case, one term per concept, specific over vague.
- No hard-coded user-facing strings. Never build sentences by concatenation; use messages with plurals and placeholders.
- Dates, numbers, and currency are localized and unambiguous. Layout uses logical (start/end) properties.

### Performance and Resilience
- Web pages stay in the good range of Core Web Vitals: LCP under 2.5 s, INP under 200 ms, CLS under 0.1.
- Show useful content progressively. Lazy-load what is off screen. Size images for the device.
- Slow and offline networks are designed for: timeouts, retry, and cached content marked as stale.

### Design System
- Tokens for color, spacing, type, radius, shadow, motion, and z-index. Components consume tokens only.
- New needs become component variants, not local overrides.
- One icon set at consistent size and stroke, with text labels unless the icon is universal.

### Trust
- Never dark patterns: pre-checked consent, hidden costs, confirm-shaming, hard-to-cancel flows.
- Ask for a permission in context, with the reason, at the moment it is needed.
- Consent is opt-in and as easy to withdraw as to give.
