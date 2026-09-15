export type BadgeStyle = {
  emoji: string // e.g. "🚀" or text like "dev"
  color: string // hex color, e.g. "#FF4500"
}

export type Link = {
  id: string
  url: string
  label: string // custom display name
  searchTerms?: string // optional; used for CommandPalette search
  badge?: BadgeStyle // optional corner badge
  invertIcon?: boolean // invert favicon in dark mode (transparent dark glyphs)
  customIcon?: string // optional base64 or URL for custom icon (future)
}

export type StandaloneLinkEntry = {
  link: Link
  position: { x: number; y: number }
}

export type Section = {
  id: string
  name: string
  accentColor: string // hex color for section header/border
  links: Link[]
  // Canvas mode position
  position: { x: number; y: number }
  /**
   * How many link tiles fit per row on canvas (1…link count when unset).
   * Not related to the 280px canvas placement grid.
   */
  canvasColumnSpan?: number
}

export type SectionLabelSize =
  | "text-xs"
  | "text-sm"
  | "text-base"
  | "text-lg"
  | "text-xl"
  | "text-2xl"
  | "text-3xl"

export type Settings = {
  searchShortcut: string
  settingsShortcut: string
  /** Toggle light/dark. Empty string disables the shortcut. */
  themeShortcut: string
  sectionLabelSize: SectionLabelSize
  /** Persist canvas viewport center across new tabs (local; optional sync via canvasScrollSync). */
  canvasRememberScroll: boolean
  /** Mirror canvas scroll anchor to chrome.storage.sync when true. */
  canvasScrollSync: boolean
  /** After layout size changes, re-apply scroll so the same viewport center stays on screen. */
  canvasRestoreScrollOnResize: boolean
}

/** Synthetic section id for list view / search grouping (not stored on canvas). */
export const UNGROUPED_SECTION_ID = "__ungrouped__"

export type AppState = {
  sections: Section[]
  standaloneLinks: StandaloneLinkEntry[]
  layoutMode: "canvas" | "list" | "folders"
  editMode: boolean
  settings: Settings
}
