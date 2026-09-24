# Cutouts

## Goal

Pin a live cutout of a webpage onto the canvas. Users pick URL and accent, draw a crop on a near-full-window iframe, then see that region as a tile at 1:1. Expand grows the same crop window without scaling the page; favicon opens the real URL.

## Implemented (v1)

- **Data:** `AppState.croppedPages` — `url`, `accentColor`, canvas `position`, `frame` `{width,height}` at save time, `crop` `{x,y,width,height}` in frame space. YAML export/import (`pegboard.yml` v2).
- **Add flow:** Canvas edit mode → **Add cutout** → URL/accent dialog → crop overlay (move/resize from corners or edges, Save/Delete/Cancel). **Hide crop** dismisses the cropper so the page can be used; navigations in that iframe update the URL saved with the cutout. The canvas tile clips exactly the saved crop at 1:1.
- **Tile:** Section-style frame: accent label with favicon (a real link to the page outside edit mode, so modifier-clicks work), hover drag handle and edit/expand actions (no add-link button). Content is the live iframe clip. Draggable like a section.
- **Expand:** The window grows and shrinks between the tile and a near-full-window view. The page stays at 1:1 and slides so the crop’s top-left meets the window’s top-left as it closes. `prefers-reduced-motion` snaps. Edit crop reopens the capture overlay on the full frame.
- **Iframes:** [`CroppedPageIframe`](../../src/components/cropped-page/CroppedPageIframe.tsx) waits until a session [`declarativeNetRequest`](../../src/lib/iframeEmbedHeaders.ts) rule is installed, then loads. The rule strips `X-Frame-Options` and `Content-Security-Policy` on `sub_frame` requests initiated by this extension (the new-tab page is not returned by an active-tab query). A second rule covers the current tab when `chrome.tabs.getCurrent()` works.
- **List/folders:** Cutouts are not shown; they remain in sync state.

## Later

- Separate **inner viewport** (e.g. mobile width) vs outer crop — not in v1; v1 frame size is the capture overlay size at save.
- Toolbar pin and `/` add-item flows ([`toolbar-pin.md`](./toolbar-pin.md), [`add-item-command.md`](./add-item-command.md)).
- Lazy/placeholder iframes when many tiles are on the board.

## Constraints

- Header stripping is scoped to the new-tab tab and does not fix every embed failure (`<meta>` CSP, nested frames, etc.).
- `chrome.storage.sync` stores metadata only; pages load live in iframes.
- Sandboxed iframes; expanded view uses a richer sandbox for interaction.

## Open questions

- Cap concurrent live iframes on canvas?

## Notes / Rejected Ideas

-
