# Sticky notes

## Goal

Free-floating notes on the canvas. Body text supports to-do checkboxes, bold, and underline. Notes are content, not links.

## Architecture fit

- **Model:** a note record on `AppState` (same idea as [`standaloneLinks`](../../src/types/index.ts)): `id`, canvas `{x, y}`, size, and a small document body. Do not overload `Link`.
- **Canvas:** render beside sections in [`Canvas.tsx`](../../src/components/canvas/Canvas.tsx); drag with the same `useDraggable` + transform pattern as [`SectionFrame.tsx`](../../src/components/canvas/SectionFrame.tsx) / [`FloatingLinkCard.tsx`](../../src/components/canvas/FloatingLinkCard.tsx).
- **Editing:** inline on the note (focused edit in [`focused-section-edit.md`](./focused-section-edit.md) can treat a note as a focus target). Formatting is a short toolbar or shortcuts for bold, underline, and a checkbox line — not a general rich-text stack.
- **Create:** add-item command ([`add-item-command.md`](./add-item-command.md)) and, while edit mode still exists, a toolbar action next to Add link.
- **Other layouts:** list/folders can show a plain text row or omit notes until canvas is the only surface that needs them.

## Constraints

- **Sync quota:** store a compact body (plain text with marks, or a tiny JSON tree). No embedded images, HTML blobs, or a WYSIWYG library.
- **Search:** notes are not omnibox links. Palette inclusion is optional and should match on text only.
- **Export:** [`pegboardConfig.ts`](../../src/lib/pegboardConfig.ts) YAML must round-trip notes or the import path will drop them.

## Open questions

- Markup: markdown-ish (`**`, checkbox lines) vs. a fixed JSON span list?
- Note color: one sticky color, or the section accent palette?

## Notes / Rejected Ideas

-
