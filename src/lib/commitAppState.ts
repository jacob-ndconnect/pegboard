import type { AppState } from "@/types"
import {
  APP_STATE_STORAGE_KEY,
  LAST_KNOWN_APP_STATE_KEY,
} from "@/lib/appStateStorageKey"
import {
  BROWSER_ACCOUNT_SYNC_KEY,
  persistAccountSyncFlag,
  persistAppState,
  readStoredSnapshots,
} from "@/lib/browserAccountSync"
import { applyStoredStateBackfill } from "@/lib/normalizeAppState"
import { coalesceAppState } from "@/lib/coalesceAppState"
import { preferIncoming, stampAppState } from "@/lib/appStateRevision"

export type StoredAppStateUpdate = AppState | "duplicate" | "invalid"

function readStoredAppState(raw: unknown): AppState | undefined {
  if (raw == null || typeof raw !== "object") return undefined
  return applyStoredStateBackfill(raw as AppState).state
}

export async function loadMutableAppState(): Promise<{
  prev: AppState
  accountSyncEnabled: boolean
  flagWasAbsent: boolean
}> {
  const [localResult, syncResult] = await Promise.all([
    new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get(
        [BROWSER_ACCOUNT_SYNC_KEY, LAST_KNOWN_APP_STATE_KEY],
        (r) => resolve(r as Record<string, unknown>)
      )
    }),
    new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.sync.get(APP_STATE_STORAGE_KEY, (r) =>
        resolve(r as Record<string, unknown>)
      )
    }),
  ])

  const { storedFlag, flagResolution } = readStoredSnapshots(
    localResult,
    syncResult,
    readStoredAppState
  )
  if (flagResolution.shouldPersistFlag) {
    await persistAccountSyncFlag(flagResolution.effective)
  }

  const fromSync = coalesceAppState(syncResult[APP_STATE_STORAGE_KEY])
  const fromLocal = coalesceAppState(localResult[LAST_KNOWN_APP_STATE_KEY])
  const accountSyncEnabled = flagResolution.effective
  const prev = accountSyncEnabled
    ? preferIncoming(fromLocal, fromSync, "hydrating")
      ? fromLocal
      : fromSync
    : fromLocal

  return {
    prev,
    accountSyncEnabled,
    flagWasAbsent: storedFlag === undefined,
  }
}

export async function writeMutableAppState(
  next: AppState,
  accountSyncEnabled: boolean,
  flagWasAbsent: boolean
): Promise<void> {
  if (flagWasAbsent && !accountSyncEnabled) {
    await persistAccountSyncFlag(false)
  }
  persistAppState(next, accountSyncEnabled)
}

/** Read the active store(s), apply update, write per browser account sync flag. */
export async function updateStoredAppState(
  update: (prev: AppState) => StoredAppStateUpdate
): Promise<"ok" | "duplicate" | "invalid"> {
  const { prev, accountSyncEnabled, flagWasAbsent } =
    await loadMutableAppState()
  const outcome = update(prev)
  if (outcome === "duplicate" || outcome === "invalid") return outcome
  const next = stampAppState(outcome)
  await writeMutableAppState(next, accountSyncEnabled, flagWasAbsent)
  return "ok"
}