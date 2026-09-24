# Focused section edit

## Goal

Replace the global edit mode with per-section editing on the canvas. Focusing a section (or note) opens its controls in place and fades everything else. Other items stay on the board at low opacity — the canvas does not switch to a separate editor screen.

## Architecture fit

- **Today:** `AppState.editMode` is a single boolean ([`types/index.ts`](../../src/types/index.ts)). [`App.tsx`](../../src/App.tsx) toggles it from [`EditModeToolbar.tsx`](../../src/components/editor/EditModeToolbar.tsx); Escape clears it. [`LinkCard`](../../src/components/canvas/LinkCard.tsx), [`SectionFrame`](../../src/components/canvas/SectionFrame.tsx), list, and folder views all branch on that flag.
- **Focus:** track `editingId` (section, note, or null) instead of a board-wide boolean. The focused frame keeps chrome (rename, add link, resize, delete). Siblings get a low-opacity class. Clicking the dimmed canvas or pressing Escape clears focus — same stack as `handleEscape` in `App.tsx`.
- **Drag:** [`DRAGGABLE_ONLY_IN_EDIT`](../../src/components/canvas/Canvas.tsx) is intentionally `false` (sections move on hover outside edit mode). Focused edit should not turn that into “can only drag while editing.”
- **Add actions:** toolbar Add section / Add link can move to the add-item command ([`add-item-command.md`](./add-item-command.md)) so leaving global edit mode does not remove a way to create items.

## Constraints

- **All three layouts:** list and folder views still use `editMode` for rearrange and inline edit. Either keep a layout-local edit affordance there, or limit this change to canvas and leave list/folders on the boolean until they get the same focus model.
- **Persistence:** do not sync “which section is focused” as part of `appState` (it is UI state, like the command palette). `editMode: false` on YAML import ([`pegboardConfig.ts`](../../src/lib/pegboardConfig.ts)) stays the safe default.
- **Motion:** fade is a CSS opacity transition and must respect `prefers-reduced-motion`.

## Open questions

- One focused section at a time, or multiple?
- Does clicking a dimmed item switch focus, or only clear it?
- Remove the Edit toolbar button entirely once create/move/edit all work without it?

## Notes / Rejected Ideas

-
