# Toolbar pin

## Goal

Click the PegBoard icon in the Chrome toolbar to pin the current tab with a choice up front: a **cutout** or a **shortcut**. A shortcut lets you set label, section, and other fields before it is saved. A cutout uses the model in [`cropped-page-widgets.md`](./cropped-page-widgets.md).

## Architecture fit

- **Today:** [`background.ts`](../../src/background.ts) registers “Pin to PegBoard” on page and link context menus and always appends an ungrouped shortcut via [`appendStandalonePin`](../../src/lib/appendStandalonePin.ts). There is no `action` popup.
- **Toolbar:** add a manifest `action` (popup or `chrome.action.onClicked`). The popup can read the active tab (`tabs` permission — the service worker already uses `chrome.tabs` for omnibox disposition) and write `appState` the same way context-menu pin does. The new tab picks it up through `chrome.storage.onChanged` in [`useStorage`](../../src/hooks/useStorage.ts).
- **Shortcut form:** reuse link fields from [`LinkEditor`](../../src/components/editor/LinkEditor.tsx) (URL, label, search terms, badge) plus a destination: ungrouped (current default) or a section — overlaps the planned “pin into a chosen section” note in [`context-menu-pin-links.md`](./context-menu-pin-links.md).
- **Widget form:** URL from the active tab, then inner size and crop (defaults are enough to land it; fine-tune on the canvas).

## Constraints

- **MV3:** popup HTML is a separate extension page, not the new tab. Share pin/normalize helpers; do not mount the whole React app in the popup.
- **Permissions:** `tabs` (active tab URL/title) if the popup cannot rely on `activeTab` alone. Context menus already cover “pin this page” without a popup.
- **Dedupe:** shortcut path should keep the canonical-URL dedupe in `appendStandalonePin`. A widget and a shortcut to the same URL can coexist — they are different item types.

## Open questions

- Popup vs. in-page picker that focuses the new tab?
- Should the context menu gain the same widget-vs-shortcut choice, or stay shortcut-only?

## Notes / Rejected Ideas

-
