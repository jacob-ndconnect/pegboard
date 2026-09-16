/// <reference types="chrome"/>

import { useRef, useState, useEffect } from "react"
import type { AppState } from "../types"
import {
  APP_STATE_STORAGE_KEY,
  LAST_KNOWN_APP_STATE_KEY,
} from "@/lib/appStateStorageKey"
import { DEFAULT_APP_STATE } from "@/lib/defaultAppState"
import { extensionDebugLog } from "@/lib/extensionDebugLog"
import { applyStoredStateBackfill } from "@/lib/normalizeAppState"
import {
  isAuthoritativeSync,
  preferIncoming,
  stampAppState,
} from "@/lib/appStateRevision"

const DEFAULT_STATE: AppState = DEFAULT_APP_STATE
const HYDRATE_WAIT_MS = 2000

function persistSync(state: AppState) {
  chrome.storage.sync.set({ [APP_STATE_STORAGE_KEY]: state })
}

function persistLastKnown(state: AppState) {
  chrome.storage.local.set({ [LAST_KNOWN_APP_STATE_KEY]: state })
}

function readStoredAppState(raw: unknown): AppState | undefined {
  if (raw == null || typeof raw !== "object") return undefined
  return applyStoredStateBackfill(raw as AppState).state
}

export function useStorage() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE)
  const [loaded, setLoaded] = useState(false)
  const hasUserSavedRef = useRef(false)
  const stateRef = useRef<AppState>(DEFAULT_STATE)
  const phaseRef = useRef<"hydrating" | "ready">("hydrating")
  const pendingSaveRef = useRef<AppState | null>(null)
  const hydrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyState = (next: AppState) => {
    stateRef.current = next
    setState(next)
    persistLastKnown(next)
  }

  const markReady = () => {
    phaseRef.current = "ready"
    if (hydrateTimerRef.current != null) {
      clearTimeout(hydrateTimerRef.current)
      hydrateTimerRef.current = null
    }
    const pending = pendingSaveRef.current
    pendingSaveRef.current = null
    if (pending && preferIncoming(pending, stateRef.current, "hydrating")) {
      applyState(pending)
      persistSync(pending)
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
      if (phaseRef.current === "ready") persistSync(stateRef.current)
      return
    }
    applyState(incoming)
  }

  useEffect(() => {
    chrome.storage.sync.get(APP_STATE_STORAGE_KEY, (syncResult) => {
      chrome.storage.local.get(LAST_KNOWN_APP_STATE_KEY, (localResult) => {
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
        if (fromLocal && (!fromSync || !syncWins)) persistSync(chosen!)
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
    })
    return () => {
      if (hydrateTimerRef.current != null) clearTimeout(hydrateTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const onSync = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
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
    }
    chrome.storage.onChanged.addListener(onSync)
    return () => chrome.storage.onChanged.removeListener(onSync)
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
        sections: next.sections.map((s) => ({
          id: s.id,
          name: s.name,
          position: s.position,
        })),
      })
      stateRef.current = next
      persistLastKnown(next)
      if (phaseRef.current === "hydrating") {
        pendingSaveRef.current = next
      } else {
        queueMicrotask(() => persistSync(next))
      }
      return next
    })
  }

  return { state, save, loaded }
}
