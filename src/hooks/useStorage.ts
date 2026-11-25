/// <reference types="chrome"/>

import { useCallback, useRef, useState, useEffect } from "react"
import type { AppState } from "../types"
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
import { DEFAULT_APP_STATE } from "@/lib/defaultAppState"
import { extensionDebugLog } from "@/lib/extensionDebugLog"
import { applyStoredStateBackfill } from "@/lib/normalizeAppState"
import { pickBestAppState } from "@/lib/pickBestAppState"
import {
  readCanvasScrollAnchor,
  writeCanvasScrollAnchor,
} from "@/lib/canvasScrollAnchor"
import {
  isAuthoritativeSync,
  preferIncoming,
  stampAppState,
} from "@/lib/appStateRevision"

const DEFAULT_STATE: AppState = DEFAULT_APP_STATE
const HYDRATE_WAIT_MS = 2000

function readStoredAppState(raw: unknown): AppState | undefined {
  if (raw == null || typeof raw !== "object") return undefined
  return applyStoredStateBackfill(raw as AppState).state
}

export function useStorage() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE)
  const [loaded, setLoaded] = useState(false)
  const [browserAccountSync, setBrowserAccountSyncState] = useState(false)
  const hasUserSavedRef = useRef(false)
  const stateRef = useRef<AppState>(DEFAULT_STATE)
  const accountSyncRef = useRef(false)
  const flagWasAbsentRef = useRef(true)
  const phaseRef = useRef<"hydrating" | "ready">("hydrating")
  const pendingSaveRef = useRef<AppState | null>(null)
  const hydrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyState = (next: AppState) => {
    stateRef.current = next
    setState(next)
    persistAppState(next, accountSyncRef.current)
  }

  const markReady = () => {
    phaseRef.current = "ready"
    if (hydrateTimerRef.current != null) {
      clearTimeout(hydrateTimerRef.current)
      hydrateTimerRef.current = null
    }
    const pending = pendingSaveRef.current
    pendingSaveRef.current = null
    if (
      pending &&
      accountSyncRef.current &&
      preferIncoming(pending, stateRef.current, "hydrating")
    ) {
      applyState(pending)
    } else if (pending && !accountSyncRef.current) {
      applyState(pending)
    }
    setLoaded(true)
  }

  const considerIncoming = (raw: unknown) => {
    const incoming = readStoredAppState(raw)
    if (!incoming) return
    if (hasUserSavedRef.current && pendingSaveRef.current) {
      if (!preferIncoming(incoming, pendingSaveRef.current, phaseRef.current)) {
        return
      }
    }
    if (!preferIncoming(incoming, stateRef.current, phaseRef.current)) {
      if (phaseRef.current === "ready" && accountSyncRef.current) {
        persistAppState(stateRef.current, true)
      }
      return
    }
    applyState(incoming)
  }

  const finishGrandfather = useCallback(
    (shouldPersistFlag: boolean, effective: boolean) => {
      accountSyncRef.current = effective
      setBrowserAccountSyncState(effective)
      if (shouldPersistFlag) {
        flagWasAbsentRef.current = false
        void persistAccountSyncFlag(effective)
      }
    },
    []
  )

  useEffect(() => {
    chrome.storage.local.get(
      [BROWSER_ACCOUNT_SYNC_KEY, LAST_KNOWN_APP_STATE_KEY],
      (localResult) => {
        const snapshots = readStoredSnapshots(
          localResult as Record<string, unknown>,
          {},
          readStoredAppState
        )
        flagWasAbsentRef.current = snapshots.storedFlag === undefined
        const { effective, shouldPersistFlag } = snapshots.flagResolution

        const loadFromLocalOnly = () => {
          const fromLocal = readStoredAppState(
            localResult[LAST_KNOWN_APP_STATE_KEY]
          )
          finishGrandfather(shouldPersistFlag, effective)
          if (fromLocal) applyState(fromLocal)
          markReady()
        }

        if (!effective) {
          loadFromLocalOnly()
          return
        }

        chrome.storage.sync.get(APP_STATE_STORAGE_KEY, (syncResult) => {
          const hydrated = readStoredSnapshots(
            localResult as Record<string, unknown>,
            syncResult as Record<string, unknown>,
            readStoredAppState
          )
          const resolved = hydrated.flagResolution
          finishGrandfather(
            resolved.shouldPersistFlag,
            resolved.effective
          )

          const fromSync = readStoredAppState(syncResult[APP_STATE_STORAGE_KEY])
          const fromLocal = readStoredAppState(
            localResult[LAST_KNOWN_APP_STATE_KEY]
          )
          const syncWins =
            fromSync != null &&
            (fromLocal == null ||
              preferIncoming(fromSync, fromLocal, "hydrating"))
          const chosen = syncWins ? fromSync : fromLocal
          if (chosen) applyState(chosen)
          if (fromLocal && (!fromSync || !syncWins) && chosen) {
            persistAppState(chosen, true)
          }
          if (isAuthoritativeSync(fromSync)) {
            markReady()
            return
          }
          hydrateTimerRef.current = setTimeout(() => {
            chrome.storage.sync.get(APP_STATE_STORAGE_KEY, (retry) => {
              considerIncoming(retry[APP_STATE_STORAGE_KEY])
              markReady()
            })
          }, HYDRATE_WAIT_MS)
          setLoaded(true)
        })
      }
    )
    return () => {
      if (hydrateTimerRef.current != null) clearTimeout(hydrateTimerRef.current)
    }
  }, [finishGrandfather])

  useEffect(() => {
    const onStorage = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (accountSyncRef.current) {
        if (area !== "sync") return
        const change = changes[APP_STATE_STORAGE_KEY]
        if (change?.newValue === undefined) return
        considerIncoming(change.newValue)
        if (
          phaseRef.current === "hydrating" &&
          isAuthoritativeSync(readStoredAppState(change.newValue))
        ) {
          markReady()
        }
        return
      }
      if (area !== "local") return
      const change = changes[LAST_KNOWN_APP_STATE_KEY]
      if (change?.newValue === undefined) return
      considerIncoming(change.newValue)
    }
    chrome.storage.onChanged.addListener(onStorage)
    return () => chrome.storage.onChanged.removeListener(onStorage)
  }, [])

  const save = (
    newStateOrUpdater: AppState | ((prev: AppState) => AppState)
  ) => {
    hasUserSavedRef.current = true
    setState((prev) => {
      const next = stampAppState(
        typeof newStateOrUpdater === "function"
          ? newStateOrUpdater(prev)
          : newStateOrUpdater
      )
      extensionDebugLog("[useStorage] save", {
        sectionsCount: next.sections.length,
        standaloneCount: next.standaloneLinks.length,
        updatedAt: next.updatedAt,
        accountSync: accountSyncRef.current,
        sections: next.sections.map((s) => ({
          id: s.id,
          name: s.name,
          position: s.position,
        })),
      })
      stateRef.current = next
      if (flagWasAbsentRef.current && !accountSyncRef.current) {
        flagWasAbsentRef.current = false
        void persistAccountSyncFlag(false)
      }
      if (phaseRef.current === "hydrating") {
        pendingSaveRef.current = next
        persistAppState(next, accountSyncRef.current)
      } else {
        queueMicrotask(() => persistAppState(next, accountSyncRef.current))
      }
      return next
    })
  }

  const setBrowserAccountSync = useCallback(
    async (enabled: boolean) => {
      if (enabled === accountSyncRef.current) return

      const [syncResult, localResult] = await Promise.all([
        new Promise<Record<string, unknown>>((resolve) => {
          chrome.storage.sync.get(APP_STATE_STORAGE_KEY, (r) => resolve(r))
        }),
        new Promise<Record<string, unknown>>((resolve) => {
          chrome.storage.local.get(LAST_KNOWN_APP_STATE_KEY, (r) => resolve(r))
        }),
      ])

      const fromSync = readStoredAppState(syncResult[APP_STATE_STORAGE_KEY])
      const fromLocal = readStoredAppState(localResult[LAST_KNOWN_APP_STATE_KEY])
      const merged = stampAppState(
        pickBestAppState([stateRef.current, fromSync, fromLocal])
      )

      accountSyncRef.current = enabled
      flagWasAbsentRef.current = false
      setBrowserAccountSyncState(enabled)
      await persistAccountSyncFlag(enabled)

      if (enabled) {
        persistAppState(merged, true)
        stateRef.current = merged
        setState(merged)
        if (merged.settings.canvasScrollSync) {
          const anchor = await readCanvasScrollAnchor(false)
          if (anchor) writeCanvasScrollAnchor(anchor, true)
        }
      } else {
        persistAppState(merged, false)
        stateRef.current = merged
        setState(merged)
      }
    },
    []
  )

  return { state, save, loaded, browserAccountSync, setBrowserAccountSync }
}