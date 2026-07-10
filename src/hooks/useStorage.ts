/// <reference types="chrome"/>

import { useRef, useState, useEffect } from "react"
import type { AppState, Section } from "../types"
import { APP_STATE_STORAGE_KEY } from "@/lib/appStateStorageKey"
import {
  getDefaultCanvasSectionPosition,
  normalizeCanvasColumnSpan,
} from "@/lib/canvasGrid"
import { DEFAULT_APP_STATE, DEFAULT_SETTINGS } from "@/lib/defaultAppState"
import { extensionDebugLog } from "@/lib/extensionDebugLog"

const DEFAULT_STATE: AppState = DEFAULT_APP_STATE

function normalizeLayoutMode(mode: unknown): AppState["layoutMode"] {
  if (mode === "canvas" || mode === "list" || mode === "folders") return mode
  return "canvas"
}

function isValidPosition(pos: unknown): pos is { x: number; y: number } {
  return (
    pos != null &&
    typeof pos === "object" &&
    typeof (pos as { x?: number }).x === "number" &&
    typeof (pos as { y?: number }).y === "number" &&
    !Number.isNaN((pos as { x: number }).x) &&
    !Number.isNaN((pos as { y: number }).y) &&
    (pos as { x: number }).x >= 0 &&
    (pos as { y: number }).y >= 0 &&
    (pos as { x: number }).x < 10000 &&
    (pos as { y: number }).y < 10000
  )
}

function migrateSections(sections: Section[]): Section[] {
  return sections.map((section, index) => {
    let next = section
    if (!isValidPosition(section.position)) {
      next = { ...next, position: getDefaultCanvasSectionPosition(index) }
    }
    const rawSpan = next.canvasColumnSpan
    if (
      rawSpan !== undefined &&
      normalizeCanvasColumnSpan(rawSpan) !== rawSpan
    ) {
      next = { ...next, canvasColumnSpan: normalizeCanvasColumnSpan(rawSpan) }
    }
    return next
  })
}

/** Normalize payload from sync (initial load, storage.onChanged, background pin). */
function normalizeStoredState(appState: AppState): AppState {
  const sections =
    appState.sections?.length > 0
      ? migrateSections(appState.sections)
      : (appState.sections ?? [])
  return {
    ...appState,
    sections,
    layoutMode: normalizeLayoutMode(appState.layoutMode),
    settings: { ...DEFAULT_SETTINGS, ...appState.settings },
    standaloneLinks: appState.standaloneLinks ?? [],
    editMode: appState.editMode === true,
  }
}

export function useStorage() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE)
  const [loaded, setLoaded] = useState(false)
  const hasUserSavedRef = useRef(false)

  useEffect(() => {
    chrome.storage.sync.get(APP_STATE_STORAGE_KEY, (result) => {
      if (hasUserSavedRef.current) return
      let appState = result[APP_STATE_STORAGE_KEY] as AppState | undefined
      if (appState?.sections?.length) {
        const migrated = migrateSections(appState.sections)
        const needsSave = migrated.some((_, i) => {
          const prev = appState!.sections[i]
          if (!isValidPosition(prev?.position)) return true
          const raw = prev?.canvasColumnSpan
          return raw !== undefined && normalizeCanvasColumnSpan(raw) !== raw
        })
        appState = { ...appState, sections: migrated }
        if (needsSave)
          chrome.storage.sync.set({ [APP_STATE_STORAGE_KEY]: appState })
      }
      if (appState) {
        const storedSettings = appState.settings
        const mergedSettings = { ...DEFAULT_SETTINGS, ...storedSettings }
        const needsPersistSettings =
          !storedSettings ||
          (
            Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[]
          ).some((k) => !(k in (storedSettings ?? {})))
        const mergedStandalone = appState.standaloneLinks ?? []
        const needsPersistStandalone = appState.standaloneLinks === undefined
        const layoutMode = normalizeLayoutMode(appState.layoutMode)
        const needsPersistLayout = layoutMode !== appState.layoutMode
        appState = {
          ...appState,
          layoutMode,
          settings: mergedSettings,
          standaloneLinks: mergedStandalone,
        }
        if (
          needsPersistSettings ||
          needsPersistStandalone ||
          needsPersistLayout
        ) {
          chrome.storage.sync.set({ [APP_STATE_STORAGE_KEY]: appState })
        }
      }
      if (appState) setState(normalizeStoredState(appState))
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
      setState(normalizeStoredState(change.newValue as AppState))
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
