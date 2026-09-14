import type { AppState, Section, Settings } from "@/types"
import {
  getDefaultCanvasSectionPosition,
  normalizeCanvasColumnSpan,
} from "@/lib/canvasGrid"
import { DEFAULT_SETTINGS } from "@/lib/defaultAppState"

export function normalizeLayoutMode(mode: unknown): AppState["layoutMode"] {
  if (mode === "canvas" || mode === "list" || mode === "folders") return mode
  return "canvas"
}

export function isValidPosition(pos: unknown): pos is { x: number; y: number } {
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

export function migrateSections(sections: Section[]): Section[] {
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

export function sectionsNeedMigrationPersist(
  before: Section[],
  after: Section[]
): boolean {
  return after.some((_, i) => {
    const prev = before[i]
    if (!isValidPosition(prev?.position)) return true
    const raw = prev?.canvasColumnSpan
    return raw !== undefined && normalizeCanvasColumnSpan(raw) !== raw
  })
}

export function mergeSettingsWithDefaults(
  stored: Settings | undefined
): Settings {
  return { ...DEFAULT_SETTINGS, ...stored }
}

export function settingsNeedBackfill(stored: Settings | undefined): boolean {
  if (!stored) return true
  return (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).some(
    (k) => !(k in stored)
  )
}

/** Normalize payload from sync, import, or storage.onChanged. */
export function normalizeAppState(appState: AppState): AppState {
  const sections =
    appState.sections?.length > 0
      ? migrateSections(appState.sections)
      : (appState.sections ?? [])
  return {
    ...appState,
    sections,
    layoutMode: normalizeLayoutMode(appState.layoutMode),
    settings: mergeSettingsWithDefaults(appState.settings),
    standaloneLinks: appState.standaloneLinks ?? [],
    editMode: appState.editMode === true,
  }
}

/** Apply backfills that should be written back to chrome.storage.sync on load. */
export function applyStoredStateBackfill(appState: AppState): {
  state: AppState
  shouldPersist: boolean
} {
  let next = appState
  let shouldPersist = false

  if (next.sections?.length) {
    const migrated = migrateSections(next.sections)
    if (sectionsNeedMigrationPersist(next.sections, migrated)) {
      shouldPersist = true
    }
    next = { ...next, sections: migrated }
  }

  const mergedSettings = mergeSettingsWithDefaults(next.settings)
  const mergedStandalone = next.standaloneLinks ?? []
  const layoutMode = normalizeLayoutMode(next.layoutMode)

  if (settingsNeedBackfill(next.settings)) shouldPersist = true
  if (next.standaloneLinks === undefined) shouldPersist = true
  if (layoutMode !== next.layoutMode) shouldPersist = true

  next = {
    ...next,
    layoutMode,
    settings: mergedSettings,
    standaloneLinks: mergedStandalone,
  }

  return { state: normalizeAppState(next), shouldPersist }
}
