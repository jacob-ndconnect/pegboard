import type { AppState } from "@/types"
import { DEFAULT_APP_STATE, DEFAULT_SETTINGS } from "@/lib/defaultAppState"

/** Loose read of a stored board. Does not migrate fields — callers persist only what they change. */
export function coalesceAppState(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_APP_STATE }
  }
  const r = raw as Partial<AppState>
  const updatedAt =
    typeof r.updatedAt === "number" &&
    Number.isFinite(r.updatedAt) &&
    r.updatedAt > 0
      ? r.updatedAt
      : undefined
  return {
    sections: Array.isArray(r.sections) ? r.sections : [],
    standaloneLinks: Array.isArray(r.standaloneLinks) ? r.standaloneLinks : [],
    croppedPages: Array.isArray(r.croppedPages) ? r.croppedPages : [],
    layoutMode:
      r.layoutMode === "list" ||
      r.layoutMode === "folders" ||
      r.layoutMode === "canvas"
        ? r.layoutMode
        : DEFAULT_APP_STATE.layoutMode,
    editMode: r.editMode === true,
    settings: { ...DEFAULT_SETTINGS, ...r.settings },
    ...(updatedAt != null ? { updatedAt } : {}),
  }
}
