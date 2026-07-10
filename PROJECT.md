# PegBoard — Project Reference

A Chrome extension that replaces the default new tab page with a customizable command center. Users organize links into sections, view them in Canvas (free-form drag) or List layout, and search via a configurable shortcut (default Cmd/Ctrl+K). A separate shortcut opens Settings (default Mod+,).

---

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS 4** + **shadcn/ui** (radix-ui, cmdk)
- **@dnd-kit** for drag-and-drop
- **@tanstack/react-hotkeys** for shortcuts (Mod+K style)
- **Chrome Extension** (Manifest V3) — `chrome_url_overrides.newtab`
- **chrome.storage.sync** for `AppState`; **chrome.storage.local** for canvas scroll anchor (optional mirror to sync)
- **Service worker** (`background.ts` → `background.js`) for omnibox

---

## Data Model

**Location:** `src/types/index.ts`

| Type               | Description                                                                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Link`             | `id`, `url`, `label`, optional `searchTerms` (palette search only), optional `badge`, optional `customIcon` (unused in UI yet)                                                                                                                                  |
| `Section`          | `id`, `name`, `accentColor`, `links[]`, `position` (`x`, `y` for Canvas), optional `canvasColumnSpan` (link **tiles per row** on canvas; default = link count; width math in `canvasGrid.ts` — tile stride matches `LinkCard` + `SectionLinkDraggable` spacing) |
| `SectionLabelSize` | Tailwind text classes (`text-xs` … `text-3xl`) for canvas section title typography                                                                                                                                                                              |
| `Settings`         | `searchShortcut`, `settingsShortcut`, `sectionLabelSize`, `canvasRememberScroll`, `canvasScrollSync`, `canvasRestoreScrollOnResize`                                                                                                                             |
| `AppState`         | `sections[]`, `layoutMode` ("canvas" \| "list"), `editMode`, `settings`                                                                                                                                                                                         |
| `BadgeStyle`       | `emoji`, `color` (hex)                                                                                                                                                                                                                                          |

---

## Entry Point & App Structure

### `src/main.tsx`

- Renders `App` inside `ThemeProvider`, `HotkeysProvider`, and `StrictMode`
- **ThemeProvider** handles dark/light/system via localStorage

### `src/App.tsx`

Root component. Responsibilities:

- Uses `useStorage` for state and persistence
- Shows loading until `loaded`
- Renders `EmptyState` when no sections, else `Canvas` or `ListView` based on `layoutMode`
- **Shortcuts:** `useHotkey` for `state.settings.searchShortcut` (toggle command palette) and `state.settings.settingsShortcut` (open settings)
- Manages dialogs: `SettingsModal`, `SectionEditor`, `LinkEditor`
- Handles `handleEscape` (close settings, command palette, section/link editors, or exit edit mode)
- Passes `save` as updater: `save((prev) => ({ ...prev, ... }))` to avoid stale closures

**Key handlers:**

- `handleSectionSave` — create/update section
- `handleLinkSave` — create/update link in `sectionIdForLink`
- `handleLinkDelete` — delete link from `sectionIdForLink`
- Settings — `onSave` merges `settings` into `AppState` via `save`

---

## Hooks

### `src/hooks/useStorage.ts`

**Purpose:** Load and persist `AppState` via `chrome.storage.sync`.

- **Returns:** `{ state, save, loaded }`
- **Defaults:** `DEFAULT_SETTINGS` (shortcuts, section label size, canvas scroll + resize toggles) merged into stored `appState.settings` on load; missing keys are backfilled and re-persisted
- **save:** Accepts `AppState` or `(prev: AppState) => AppState`; uses functional `setState` and `queueMicrotask` for storage write
- **Migration:** `migrateSections` adds valid `position` for sections missing it (3-column grid)
- **Guard:** `hasUserSavedRef` prevents initial load from overwriting user saves if load callback runs late

### `src/hooks/useCanvasScrollAnchor.ts`

**Purpose:** Persist and restore canvas scroll using viewport-center coordinates in content space.

- **Reads/writes:** `canvasScrollAnchor` in `chrome.storage.local`; when `settings.canvasScrollSync` is true, also mirrors to `chrome.storage.sync`
- **Restore:** On mount (if `canvasRememberScroll`), load anchor and apply after layout (double `requestAnimationFrame`); if none, scrolls to geometric center of scrollable content
- **Save:** Debounced `scroll` (~200ms); flush on `visibilitychange` (hidden) / `pagehide`
- **Resize:** When `canvasRestoreScrollOnResize`, a ref holds the **last content-space viewport center** (updated on scroll and after restore); after scrollport or content size changes, that point is re-centered (`ResizeObserver` + `window.resize`, coalesced with `requestAnimationFrame`). If the ref is still unset, it is seeded from the current viewport center before reclamp. Recomputing the center from `scrollLeft`/`scrollTop` immediately after resize cancels the adjustment because `clientWidth`/`clientHeight` changed but scroll offsets have not. The scroll listener and resize `ResizeObserver` attach in **`useLayoutEffect`** so subscriptions line up with committed refs.

### `src/hooks/useCanvasPointerPan.ts`

**Purpose:** Figma-style canvas pan without replacing native wheel scroll.

- **Space:** When not typing in a field, `keydown` Space calls `preventDefault` (avoids page scroll) and tracks “hand tool”; that includes **repeat** `keydown` events while Space is held, which otherwise scroll the page. `keyup` / `window` `blur` clears it.
- **Gestures:** `pointerdown` capture on the canvas scroll root — middle button (skips `a[href]`) or primary + Space — `preventDefault`/`stopPropagation`, `setPointerCapture`, adjust `scrollLeft`/`scrollTop` from pointer delta vs. gesture start.
- **Resize / capture loss:** `window` `resize` and `blur` force-end an active pan (avoids global `pointermove` fighting `useCanvasScrollAnchor` reclamp); `onLostPointerCapture` clears grab state when the browser drops capture.

### TanStack HotKeys

**Purpose:** Platform-aware shortcuts (Mod = ⌘ on Mac, Ctrl on Windows).

- **Provider:** `HotkeysProvider` wraps `App` in `main.tsx`
- **App:** `useHotkey(searchShortcut, …)`, `useHotkey(settingsShortcut, …)` — values come from `state.settings`, not hardcoded strings
- **Display:** `formatForDisplay(state.settings.searchShortcut)` in `EditModeToolbar` for the search field key hints

### `src/hooks/useEscape.ts`

**Purpose:** Escape key triggers a callback.

- **Usage:** `useEscape({ onEscape: handleEscape })`
- **Options:** `enabled` (default true)

---

## Background & Omnibox

**Files:** `src/background.ts` (built to `background.js`), `public/manifest.json`

- **Manifest:** `"omnibox": { "keyword": "pin" }` — changing the keyword requires editing the manifest / repacking the extension; Settings shows an **info** row explaining Chrome’s “Manage search engines” flow
- **Behavior:** On input, reads `chrome.storage.sync` under the same `appState` key as the new tab page, filters links by label / domain / `searchTerms`, suggests matches; Enter navigates current or new tab based on disposition
- **Types:** Background uses a minimal `AppState` shape (sections + links); keep in sync when adding top-level fields the omnibox should ignore or use

---

## Components

### Canvas Layout (`src/components/canvas/`)

#### `Canvas.tsx`

Free-form canvas with drag-and-drop sections.

- **DndContext** (PointerSensor, 8px activation)
- **Drag behavior:** Uses `transform` from `useDraggable` (not `event.delta`) because dnd-kit’s delta is wrong in scrollable containers
- **Flow:** `SectionFrame` reports transform via `onTransformChange` → stored in `transformRef` → on `handleDragEnd`, `newPosition = startPos + transform`
- **normalizePosition:** Ensures valid `{x,y}` or falls back to grid position
- **Layout:** Scrollable outer div (`overflow-auto`) with `ref` for scroll persistence; inner `placementRootRef` supplies min size; in edit mode the canvas area uses the `canvas-grid` class for the dot grid (CSS in `index.css`)
- **Panning:** Native wheel/trackpad scroll unchanged. **Pointer pan** via `useCanvasPointerPan`: middle-mouse drag (except on `a[href]` so middle-click-open-in-tab still works) and **Space** + primary drag; capture-phase handlers adjust `scrollLeft`/`scrollTop` and block Chrome middle-click autoscroll on non-link targets.
- **Scroll persistence:** `useCanvasScrollAnchor` saves the viewport center in content coordinates and restores on new tab (still driven by scroll events from wheel and pointer pan); **Sync** tab: `canvasRememberScroll`, `canvasScrollSync`, `canvasRestoreScrollOnResize`
- **Settings:** Passes `settings.sectionLabelSize` into `SectionFrame`
- **Drag gating:** `DRAGGABLE_ONLY_IN_EDIT` — kept `false` on purpose so sections remain draggable outside edit mode (drag handle appears on hover when not editing). Set to `true` to require edit mode for moves.

#### `SectionFrame.tsx`

Draggable section card (Canvas only).

- **useDraggable** — `disabled` when `!isDraggable` (see `Canvas` and `DRAGGABLE_ONLY_IN_EDIT`)
- **onTransformChange** — reports transform to parent for position calculation
- **Renders:** Section title with `sectionLabelSize`; header actions (add link, edit section); bordered area of `LinkCards`; edit-mode corner resize (snaps by **link-tile** width via `LINK_CARD_WIDTH_PX` / `LINK_CARD_GAP_PX` in `canvasGrid.ts`; span = tiles per row, clamped `1…links.length`; explicit `section.canvasColumnSpan` when set, else default = link count). Debug: `localStorage.pegboardDebugSectionResize = "1"` on the new tab page → `[SectionResize]` logs in DevTools.

#### `LinkCard.tsx`

iOS-style link card: favicon or letter placeholder, optional badge, label.

- **Edit mode:** Click opens editor; hover shows pencil overlay; top-right pencil button is always visible when `onEdit` is passed
- **View mode:** Click navigates to `link.url`; same pencil appears on hover (`onEdit`)
- **Favicon:** `getFaviconUrl` / `getFaviconFallbackUrl` from `src/lib/favicon.ts`; fallback to first letter with generated color

---

### List Layout (`src/components/list/`)

#### `ListView.tsx`

Scrollable list of sections.

#### `SectionRow.tsx`

Single section: header (name, accent dot, edit button), horizontal scroll of `LinkCards`, Add Link button. Section header typography is fixed in this file (not yet wired to `settings.sectionLabelSize`).

---

### Search

#### `src/components/search/CommandPalette.tsx`

- **Trigger:** User shortcut from `settings.searchShortcut`, registered in `App.tsx` via `useHotkey`
- **cmdk**-based dialog; search matches label, domain (`getDomain`), and optional `searchTerms`
- **Groups:** By section
- **List row label:** Shows `link.searchTerms ?? link.label`
- **Select:** Opens link in current tab (`window.location.href`)

---

### Settings (`src/components/settings/`)

#### `SettingsModal.tsx`

Dialog with vertical **Tabs**: Keyboard, Appearance, Sync, Support.

- Receives `settings` and `onSave` from `App`; each change calls `onSave({ ...settings, [key]: value })`
- Renders rows from `settingsConfig.ts` (`SETTINGS_SECTIONS`) via `HotkeySetting`, `SelectSetting`, `BooleanSetting`, `InfoSetting`, or custom `Content` (Support tab)

#### `settingsConfig.ts`

- Defines tab sections: shortcuts + omnibox info (**Keyboard**), **Section label size** (**Appearance**), canvas scroll persistence (**Sync**), and **Support** content
- **Support:** `SupportSection` + `SUPPORT_CONFIG` (links, avatar asset, etc.)

---

### Edit Mode & Toolbar

#### `src/components/editor/EditModeToolbar.tsx`

Fixed toolbar (top: edit toggle, search affordance with shortcut chips, settings gear, layout toggle; bottom in edit mode: add section, reset canvas positions when applicable).

- **Edit** — toggles `editMode` (uses `save({ ...state, … })` for this path)
- **Canvas / List** — switches `layoutMode`
- **Add Section** — opens `SectionEditor` with `section: null`
- **Reset positions** — re-grids Canvas sections when layout is canvas and positions were customized

#### `src/components/editor/SectionEditor.tsx`

Dialog for create/edit section.

- **Fields:** Name, accent color (`ColorPickerPopover` from `src/components/ui/color-picker.tsx`, `COLOR_SWATCHES`)
- **Creates:** New section with `crypto.randomUUID()`, default position `{x:40, y:40}`
- **Delete:** When editing an existing section, destructive footer action removes it from `sections` (same pattern as `LinkEditor`)

#### `src/components/editor/LinkEditor.tsx`

Dialog for create/edit link.

- **Fields:** URL, label, optional **Search terms** (Mod+K / palette only; not shown on cards), badge emoji (max 2 chars), badge color
- **Preview:** `LinkCard`
- **Delete:** Only when editing an existing link

#### `src/components/editor/ColorPickerField.tsx`

Color input: native picker, hex input, swatches from `COLOR_SWATCHES`.

---

### Other

#### `src/components/EmptyState.tsx`

First-run view when no sections; prompts user to click Edit.

#### `src/components/theme-provider.tsx`

Theme context (dark/light/system), localStorage persistence, system preference listener.

---

## Lib Utilities

| File                            | Exports                                                                          | Purpose                                                   |
| ------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `src/lib/utils.ts`              | `cn(...)`                                                                        | `clsx` + `tailwind-merge` for class names                 |
| `src/lib/canvasScrollAnchor.ts` | `readCanvasScrollAnchor`, `writeCanvasScrollAnchor`, `applyScrollToCenter`, etc. | Canvas scroll anchor in `storage.local` / optional `sync` |
| `src/lib/favicon.ts`            | `getFaviconUrl`, `getFaviconFallbackUrl`                                         | Favicon URLs for a link’s domain                          |
| `src/lib/url.ts`                | `getDomain(url)`                                                                 | Hostname without `www.`                                   |
| `src/lib/color-swatches.ts`     | `COLOR_SWATCHES`                                                                 | Preset hex colors for pickers                             |
| `src/lib/color.ts`              | `getContrastColor`                                                               | Text color on colored section headers                     |

---

## UI Components (shadcn)

- `src/components/ui/button.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/command.tsx` (cmdk)
- `src/components/ui/popover.tsx`
- `src/components/ui/input-group.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/tabs.tsx` (shadcn / radix-ui preset — `TabsTrigger`, `TabsContent`, …)
- `src/components/ui/tabs-classic.tsx` — minimal `@radix-ui/react-tabs` primitives (e.g. Settings)
- `src/components/ui/tabs-subtle.tsx` — custom index-based tabs (`TabsSubtle`, …)
- `src/components/ui/tabs-proximity.tsx` — Radix tabs + proximity hover + `TabItem` / `shape` (e.g. edit toolbar)
- `src/components/ui/slider.tsx` (shadcn preset — multi-thumb API)
- `src/components/ui/slider-rich.tsx` — custom slider + `SliderComfortable` (used by color picker)
- `src/components/ui/kbd.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/tooltip.tsx`
- `src/components/ui/color-picker.tsx` (`ColorPicker`, `ColorPickerPopover`, …)

---

## Key Patterns

1. **State updates:** Prefer `save((prev) => ({ ...prev, ... }))` to avoid stale closures.
2. **Canvas drag:** Use `transform` from `useDraggable`, not `event.delta`, in scrollable containers.
3. **Positions:** `normalizePosition` and `migrateSections` ensure valid `{x,y}`; invalid values get grid fallback.
4. **Extension:** `chrome.storage.sync` for `appState`; canvas scroll anchor uses `storage.local` (optional `sync`); `base: "./"` in Vite for extension asset paths.
5. **Settings:** Defaults merged on load in `useStorage`; new `Settings` keys should be added to `DEFAULT_SETTINGS` and optionally to `settingsConfig` UI.

---

## File Tree (Relevant)

```
src/
├── App.tsx                 # Root, layout, dialogs, hotkeys
├── main.tsx
├── background.ts           # Omnibox → storage (built to background.js)
├── index.css
├── types/index.ts
├── hooks/
│   ├── useStorage.ts       # Chrome storage + state + settings merge
│   ├── useCanvasScrollAnchor.ts
│   ├── useCanvasPointerPan.ts
│   └── useEscape.ts        # Escape key
├── components/
│   ├── canvas/
│   │   ├── Canvas.tsx
│   │   ├── SectionFrame.tsx
│   │   └── LinkCard.tsx
│   ├── list/
│   │   ├── ListView.tsx
│   │   └── SectionRow.tsx
│   ├── search/
│   │   └── CommandPalette.tsx
│   ├── settings/
│   │   ├── SettingsModal.tsx
│   │   ├── settingsConfig.ts
│   │   ├── BooleanSetting.tsx
│   │   ├── HotkeySetting.tsx
│   │   ├── SelectSetting.tsx
│   │   ├── InfoSetting.tsx
│   │   └── SupportSection.tsx
│   ├── editor/
│   │   ├── EditModeToolbar.tsx
│   │   ├── SectionEditor.tsx
│   │   ├── LinkEditor.tsx
│   │   └── ColorPickerField.tsx
│   ├── EmptyState.tsx
│   ├── theme-provider.tsx
│   └── ui/                 # shadcn
└── lib/
    ├── utils.ts
    ├── canvasScrollAnchor.ts
    ├── favicon.ts
    ├── url.ts
    ├── color.ts
    └── color-swatches.ts
public/
└── manifest.json           # MV3: newtab override, omnibox, permissions
```

---

## For AI Agents

- **State:** Single source in `useStorage`; `save` accepts object or updater.
- **Canvas drag:** Do not use `event.delta`; use `transform` from `useDraggable` via `onTransformChange`.
- **Adding features:** Follow existing patterns (updater form for `save`, `normalizePosition` for positions).
- **Debug logs:** `[Canvas]` and `[useStorage]` logs exist; remove when done.
- **Extension:** Load unpacked from `dist/` after `npm run build`; manifest at `public/manifest.json`.
- **Buttons:** Always make sure buttons have the tailwind class `cursor-pointer`.
