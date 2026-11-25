import type { AppState } from "@/types"
import {
  APP_STATE_STORAGE_KEY,
  LAST_KNOWN_APP_STATE_KEY,
} from "@/lib/appStateStorageKey"
import { isAuthoritativeSync } from "@/lib/appStateRevision"

export const BROWSER_ACCOUNT_SYNC_KEY = "browserAccountSync"

export type AccountSyncFlagResolution = {
  effective: boolean
  /** When true, write `effective` to chrome.storage.local. */
  shouldPersistFlag: boolean
}

/** Pure infer rules for unit tests and load. */
export function resolveAccountSyncFlag(
  stored: unknown,
  fromSync: AppState | undefined,
  fromLocal: AppState | undefined
): AccountSyncFlagResolution {
  if (stored === true) {
    return { effective: true, shouldPersistFlag: false }
  }
  if (stored === false) {
    return { effective: false, shouldPersistFlag: false }
  }
  const hasBoard =
    isAuthoritativeSync(fromSync) || isAuthoritativeSync(fromLocal)
  if (hasBoard) {
    return { effective: true, shouldPersistFlag: true }
  }
  return { effective: false, shouldPersistFlag: false }
}

function readRawFlag(
  raw: unknown
): boolean | undefined {
  if (raw === true) return true
  if (raw === false) return false
  return undefined
}

export function persistAccountSyncFlag(enabled: boolean): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [BROWSER_ACCOUNT_SYNC_KEY]: enabled }, () =>
      resolve()
    )
  })
}

export function persistLastKnownAppState(state: AppState): void {
  chrome.storage.local.set({ [LAST_KNOWN_APP_STATE_KEY]: state })
}

export function persistSyncAppState(state: AppState): void {
  chrome.storage.sync.set({ [APP_STATE_STORAGE_KEY]: state })
}

/** Always mirrors lastKnown; sync only when account sync is on. */
export function persistAppState(state: AppState, accountSyncEnabled: boolean) {
  persistLastKnownAppState(state)
  if (accountSyncEnabled) {
    persistSyncAppState(state)
  }
}

export type StoredSnapshots = {
  storedFlag: boolean | undefined
  flagResolution: AccountSyncFlagResolution
}

export function readStoredSnapshots(
  localRaw: Record<string, unknown>,
  syncRaw: Record<string, unknown>,
  readAppState: (raw: unknown) => AppState | undefined
): StoredSnapshots {
  const fromSync = readAppState(syncRaw[APP_STATE_STORAGE_KEY])
  const fromLocal = readAppState(localRaw[LAST_KNOWN_APP_STATE_KEY])
  const storedFlag = readRawFlag(localRaw[BROWSER_ACCOUNT_SYNC_KEY])
  const flagResolution = resolveAccountSyncFlag(
    storedFlag,
    fromSync,
    fromLocal
  )
  return { storedFlag, flagResolution }
}