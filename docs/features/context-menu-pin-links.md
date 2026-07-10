# Pin links from context menu

## Goal

Let users add the current tab’s URL (or a link’s URL from context) into PegBoard data without opening the new tab page first.

## Implemented (v1)

- **Menu:** “Pin to PegBoard” on **page** and **link** contexts, registered from [`src/background.ts`](../../src/background.ts) on `chrome.runtime.onInstalled` (after `removeAll` to avoid duplicate items on reload).
- **Target:** New pins go to **ungrouped** only — appended to `AppState.standaloneLinks` with canvas spawn position from [`standaloneSpawnPosition`](../../src/lib/standaloneSpawnPosition.ts). Users can move links into a section from the new tab UI ([`moveLinkInState`](../../src/lib/linkMove.ts)).
- **Merge / dedupe:** [`appendStandalonePin`](../../src/lib/appendStandalonePin.ts) — http(s) only; **dedupes** by canonical URL (origin + path without trailing slash + search + hash) against all section links and standalone links.
- **Labels:** Page context uses `tab.title` when present; link context falls back to hostname (same idea as editor fallbacks).
- **Storage:** [`APP_STATE_STORAGE_KEY`](../../src/lib/appStateStorageKey.ts) (`appState`); background uses [`coalesceAppState`](../../src/background.ts) + shared defaults from [`defaultAppState`](../../src/lib/defaultAppState.ts).
- **New tab stays in sync:** [`useStorage`](../../src/hooks/useStorage.ts) listens to `chrome.storage.onChanged` so pins from the service worker show up without closing the page; merges respect the same normalization as initial load.
- **Manifest:** `contextMenus` permission; service worker is a **single IIFE** bundle via esbuild in [`vite.config.ts`](../../vite.config.ts) (`bundleBackgroundServiceWorker` plugin) so Chrome does not need `"type": "module"` on `background`.

## Later (not built yet)

- **Pin into a specific section:** e.g. context submenu per section, default section in settings, or a small picker — product/UX still TBD.

## References

- MV3 [`chrome.contextMenus`](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)
