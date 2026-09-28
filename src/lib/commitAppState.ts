import type { AppState } from "@/types"
import {
  APP_STATE_STORAGE_KEY,
  LAST_KNOWN_APP_STATE_KEY,
} from "@/lib/appStateStorageKey"
import { coalesceAppState } from "@/lib/coalesceAppState"
import { preferIncoming, stampAppState } from "@/lib/appStateRevision"

export type StoredAppStateUpdate = AppState | "duplicate" | "invalid"

/** Read sync + local the same way the context-menu pin does, then write both copies. */
export async function updateStoredAppState(
  update: (prev: AppState) => StoredAppStateUpdate
): Promise<"ok" | "duplicate" | "invalid"> {
  const [syncResult, localResult] = await Promise.all([
    chrome.storage.sync.get(APP_STATE_STORAGE_KEY),
    chrome.storage.local.get(LAST_KNOWN_APP_STATE_KEY),
  ])
  const fromSync = coalesceAppState(syncResult[APP_STATE_STORAGE_KEY])
  const fromLocal = coalesceAppState(localResult[LAST_KNOWN_APP_STATE_KEY])
  const prev = preferIncoming(fromLocal, fromSync, "hydrating")
    ? fromLocal
    : fromSync
  const outcome = update(prev)
  if (outcome === "duplicate" || outcome === "invalid") return outcome
  const next = stampAppState(outcome)
  await chrome.storage.sync.set({ [APP_STATE_STORAGE_KEY]: next })
  await chrome.storage.local.set({ [LAST_KNOWN_APP_STATE_KEY]: next })
  return "ok"
}
