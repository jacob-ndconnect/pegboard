import type { AppState, Settings } from "@/types"

export const DEFAULT_SETTINGS: Settings = {
  searchShortcut: "Mod+K",
  settingsShortcut: "Mod+,",
  themeShortcut: "d",
  sectionLabelSize: "text-lg",
  canvasRememberScroll: true,
  canvasScrollSync: false,
  canvasRestoreScrollOnResize: true,
}

export const DEFAULT_APP_STATE: AppState = {
  sections: [],
  standaloneLinks: [],
  layoutMode: "canvas",
  editMode: false,
  settings: { ...DEFAULT_SETTINGS },
}
