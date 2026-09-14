# Data portability and storage limits

## Goal

Let users back up and restore their layout via a human-editable YAML config and stay within Chrome extension storage limits so saves never silently fail as data grows.

## Implemented design

### Config file (`pegboard.yml`)

- **Format:** YAML 1.2 with top-level `version` (currently `1`), `layout`, optional `theme`, `settings`, `sections`, and `ungrouped` (canvas positions for standalone links).
- **Export:** Settings → **Data** → Export downloads `pegboard.yml` (includes current theme from `ThemeProvider`).
- **Import:** File pick → confirm **replace** → writes normalized `AppState` to `chrome.storage.sync` via `save`. JSON files (`{...}`) are also accepted.
- **Not in file:** `editMode` (session-only), canvas scroll anchor (`storage.local` / optional sync mirror).

### Code

| Module | Role |
| ------ | ---- |
| [`src/lib/pegboardConfig.ts`](../../src/lib/pegboardConfig.ts) | Parse/serialize (dynamic `import("yaml")` in async paths), `CONFIG_VERSION`, per-version file migrators, ID coercion |
| [`src/lib/normalizeAppState.ts`](../../src/lib/normalizeAppState.ts) | Single normalizer for sync load, import, and `storage.onChanged` (layout, sections, settings defaults, standalone links) |
| [`src/hooks/useStorage.ts`](../../src/hooks/useStorage.ts) | Persists backfill when stored blob is missing new keys or needs section position migration |
| [`src/components/settings/DataSection.tsx`](../../src/components/settings/DataSection.tsx) | Export/import UI |

### Versioning

1. **File `version`:** Increment `CONFIG_VERSION` and add `CONFIG_MIGRATORS[n]` when the YAML document shape changes (rename keys, move settings). Missing `version` is treated as `0`.
2. **AppState:** Renamed settings keys and similar moves belong in `normalizeAppState` / `mergeSettingsWithDefaults` so sync and import stay in sync.

### Tests

`npm test` runs [`src/lib/pegboardConfig.test.ts`](../../src/lib/pegboardConfig.test.ts) (migration, ID assignment, JSON parse, YAML parse).

## Constraints

- **`chrome.storage.sync`:** Per-item and total quota are small relative to rich media; base64 icons or huge `searchTerms` strings increase risk ([`custom-link-icons.md`](./custom-link-icons.md) overlaps).
- **Import:** Replace-only (no merge) to avoid surprise data loss.
- **MV3:** Download/upload uses `Blob`, `<a download>`, and `<input type="file">` — no extra permissions.

## Future

- Hard caps or `storage.local` fallback if a single `appState` blob exceeds sync quota.
- Optional export of canvas scroll anchor as a separate key or config field.

## Notes / Rejected Ideas

- Full raw `chrome.storage.sync` dump as the export format (replaced by curated YAML dotfile-style config).
