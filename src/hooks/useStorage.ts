/// <reference types="chrome"/>

import { useRef, useState, useEffect } from "react"
import type { AppState } from "../types"
import { APP_STATE_STORAGE_KEY } from "@/lib/appStateStorageKey"
import { DEFAULT_APP_STATE } from "@/lib/defaultAppState"
import { extensionDebugLog } from "@/lib/extensionDebugLog"
import {
  applyStoredStateBackfill,
  normalizeAppState,
} from "@/lib/normalizeAppState"

const DEFAULT_STATE: AppState = DEFAULT_APP_STATE

export function useStorage() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE)
  const [loaded, setLoaded] = useState(false)
  const hasUserSavedRef = useRef(false)

  useEffect(() => {
    chrome.storage.sync.get(APP_STATE_STORAGE_KEY, (result) => {
      if (hasUserSavedRef.current) return
      let appState = result[APP_STATE_STORAGE_KEY] as AppState | undefined
      if (appState) {
        const { state: backfilled, shouldPersist } =
          applyStoredStateBackfill(appState)
        appState = backfilled
        if (shouldPersist) {
          chrome.storage.sync.set({ [APP_STATE_STORAGE_KEY]: appState })
        }
      }
      if (appState) setState(appState)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    const onSync = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== "sync") return
      const change = changes[APP_STATE_STORAGE_KEY]
      if (change?.newValue === undefined) return
      setState(normalizeAppState(change.newValue as AppState))
      setLoaded(true)
    }
    chrome.storage.onChanged.addListener(onSync)
    return () => chrome.storage.onChanged.removeListener(onSync)
  }, [])

  const save = (
    newStateOrUpdater: AppState | ((prev: AppState) => AppState)
  ) => {
    hasUserSavedRef.current = true
    setState((prev) => {
      const newState =
        typeof newStateOrUpdater === "function"
          ? newStateOrUpdater(prev)
          : newStateOrUpdater
      extensionDebugLog("[useStorage] save", {
        sectionsCount: newState.sections.length,
        standaloneCount: newState.standaloneLinks.length,
        sections: newState.sections.map((s) => ({
          id: s.id,
          name: s.name,
          position: s.position,
        })),
      })
      queueMicrotask(() => {
        chrome.storage.sync.set({ [APP_STATE_STORAGE_KEY]: newState })
      })
      return newState
    })
  }

  return { state, save, loaded }
}
