import type { AppState } from "@/types"
import {
  APP_STATE_STORAGE_KEY,
  LAST_KNOWN_APP_STATE_KEY,
} from "@/lib/appStateStorageKey"
import {
  BROWSER_ACCOUNT_SYNC_KEY,
  readStoredSnapshots,
} from "@/lib/browserAccountSync"
import { applyStoredStateBackfill } from "@/lib/normalizeAppState"
import { coalesceAppState } from "@/lib/coalesceAppState"
import { preferIncoming } from "@/lib/appStateRevision"

function readStoredAppState(raw: unknown): AppState | undefined {
  if (raw == null || typeof raw !== "object") return undefined
  return applyStoredStateBackfill(raw as AppState).state
}

/** Omnibox / background reads: account sync blob or local lastKnown. */
export function readBoardForOmnibox(
  callback: (state: AppState) => void
): void {
  chrome.storage.local.get(
    [BROWSER_ACCOUNT_SYNC_KEY, LAST_KNOWN_APP_STATE_KEY],
    (localResult) => {
      const localRaw = localResult as Record<string, unknown>
      if (localRaw[BROWSER_ACCOUNT_SYNC_KEY] === false) {
        callback(coalesceAppState(localRaw[LAST_KNOWN_APP_STATE_KEY]))
        return
      }
      chrome.storage.sync.get(APP_STATE_STORAGE_KEY, (syncResult) => {
        const snapshots = readStoredSnapshots(
          localRaw,
          syncResult as Record<string, unknown>,
          readStoredAppState
        )
        if (!snapshots.flagResolution.effective) {
          callback(coalesceAppState(localRaw[LAST_KNOWN_APP_STATE_KEY]))
          return
        }
        const fromSync = coalesceAppState(
          (syncResult as Record<string, unknown>)[APP_STATE_STORAGE_KEY]
        )
        const fromLocal = coalesceAppState(localRaw[LAST_KNOWN_APP_STATE_KEY])
        callback(
          preferIncoming(fromLocal, fromSync, "hydrating") ? fromLocal : fromSync
        )
      })
    }
  )
}