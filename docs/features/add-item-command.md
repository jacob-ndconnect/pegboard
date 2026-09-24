# Add-item command

## Goal

Insert board items from a typed `/` command (individual, group, page snippet, widget, tool) and from a right-click menu on the canvas itself. The new item should appear at the pointer or viewport center, not only through the edit toolbar.

## Architecture fit

- **Palette:** [`CommandPalette.tsx`](../../src/components/search/CommandPalette.tsx) is search-only today (Mod+K, cmdk). A `/` mode can be a filtered command group in that dialog, or a small canvas-anchored menu if `/` should not steal the global shortcut.
- **Create handlers** already live in [`App.tsx`](../../src/App.tsx): `handleSectionSave` (group), `handleLinkSave` (individual). Page snippet creation waits on [`cropped-page-widgets.md`](./cropped-page-widgets.md). “Widget” and “tool” are placeholders until those item types exist — the menu should list only types the board can actually store.
- **Canvas menu:** right-click on empty canvas in [`Canvas.tsx`](../../src/components/canvas/Canvas.tsx) (not on a link or section). Placement uses the same content-space coordinates as section drag (`position` / standalone `{x,y}`).
- **Edit toolbar** ([`EditModeToolbar.tsx`](../../src/components/editor/EditModeToolbar.tsx)) keeps Add section / Add link; the command is the canvas-native path, including when global edit mode goes away ([`focused-section-edit.md`](./focused-section-edit.md)).

## Constraints

- **Context:** the canvas is a new tab page, so this is an in-page menu, not `chrome.contextMenus` (that API is for web pages and is already used for pin-from-browser in [`background.ts`](../../src/background.ts)).
- **Typing:** `/` must not fire while an input, editor, or the command palette is focused (same guard as Space pan in [`useCanvasPointerPan`](../../src/hooks/useCanvasPointerPan.ts)).
- **Item types:** do not add menu rows for widgets/tools with no data model. Ship individual + group first; add snippet when that type exists.

## Open questions

- Is `/` a prefix inside the existing palette, or a separate canvas menu?
- “Widget” and “tool” — which concrete types, or are they just the page snippet and sticky note?

## Notes / Rejected Ideas

-
