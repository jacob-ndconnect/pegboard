# Toolbar pin

## Goal

Click the PegBoard icon in the Chrome toolbar to pin the current tab with a choice up front: a **shortcut** or a **cutout**.

## What shipped

- Manifest `action.default_popup` is [`popup.html`](../../popup.html) ([`src/popup/Popup.tsx`](../../src/popup/Popup.tsx)).
- The popup reads the active tab. `http`/`https` pages get two actions, using the same icons as the edit bar (`LinkSimpleIcon`, `BrowserIcon`). Other pages (Chrome settings, the new tab itself) get a short explanation.
- **Add shortcut** shows the link fields from [`LinkEditor`](../../src/components/editor/LinkEditor.tsx) inside the popup (no dialog). Save appends an ungrouped link via [`appendStandalonePin`](../../src/lib/appendStandalonePin.ts), including label, search terms, badge, and invert. Duplicate URLs stay blocked.
- **Add cutout** opens `index.html?cutout=<url>&cutoutLabel=<title>` in a new tab. [`App`](../../src/App.tsx) opens the same Add Cutout dialog as the board, with that URL and the tab title filled in. Saving the cutout switches the board to canvas so the tile is visible. The query is removed from the address bar so a refresh does not reopen the dialog.

## Constraints

- The popup is its own extension page. It shares pin helpers; it does not mount the canvas.
- Cutout cropping needs the full new-tab page (iframe + overlay), so that path leaves the popup.
- A shortcut and a cutout for the same URL can both exist.
