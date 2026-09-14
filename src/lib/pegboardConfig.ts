import type {
  AppState,
  Link,
  Section,
  SectionLabelSize,
  Settings,
  StandaloneLinkEntry,
} from "@/types"
import { normalizeAppState, isValidPosition } from "@/lib/normalizeAppState"
import { DEFAULT_SETTINGS } from "@/lib/defaultAppState"

export const CONFIG_VERSION = 1

export type PegboardTheme = "dark" | "light" | "system"

export type PegboardConfigDocument = {
  version: number
  layout: AppState["layoutMode"]
  theme?: PegboardTheme
  settings: Settings
  sections: Section[]
  ungrouped: Array<Link & { position: { x: number; y: number } }>
}

type UnknownRecord = Record<string, unknown>

const THEME_VALUES: PegboardTheme[] = ["dark", "light", "system"]

function isRecord(value: unknown): value is UnknownRecord {
  return value != null && typeof value === "object" && !Array.isArray(value)
}

function parseTheme(value: unknown): PegboardTheme | undefined {
  if (typeof value !== "string") return undefined
  return THEME_VALUES.includes(value as PegboardTheme)
    ? (value as PegboardTheme)
    : undefined
}

function newId(): string {
  return crypto.randomUUID()
}

function coerceLink(raw: unknown, assignId: boolean): Link | null {
  if (!isRecord(raw)) return null
  const url = typeof raw.url === "string" ? raw.url.trim() : ""
  const label = typeof raw.label === "string" ? raw.label.trim() : ""
  if (!url || !label) return null
  const id =
    typeof raw.id === "string" && raw.id.length > 0
      ? raw.id
      : assignId
        ? newId()
        : ""
  if (!id) return null
  const link: Link = { id, url, label }
  if (typeof raw.searchTerms === "string" && raw.searchTerms.length > 0) {
    link.searchTerms = raw.searchTerms
  }
  if (isRecord(raw.badge)) {
    const emoji =
      typeof raw.badge.emoji === "string" ? raw.badge.emoji : undefined
    const color =
      typeof raw.badge.color === "string" ? raw.badge.color : undefined
    if (emoji && color) link.badge = { emoji, color }
  }
  if (typeof raw.customIcon === "string" && raw.customIcon.length > 0) {
    link.customIcon = raw.customIcon
  }
  return link
}

function coerceSection(raw: unknown): Section | null {
  if (!isRecord(raw)) return null
  const name = typeof raw.name === "string" ? raw.name.trim() : ""
  if (!name) return null
  const id =
    typeof raw.id === "string" && raw.id.length > 0 ? raw.id : newId()
  const accentColor =
    typeof raw.accentColor === "string" ? raw.accentColor : "#6366f1"
  const linksRaw = Array.isArray(raw.links) ? raw.links : []
  const links: Link[] = []
  for (const item of linksRaw) {
    const link = coerceLink(item, true)
    if (link) links.push(link)
  }
  const position = isValidPosition(raw.position)
    ? raw.position
    : { x: 40, y: 40 }
  const section: Section = { id, name, accentColor, links, position }
  if (typeof raw.canvasColumnSpan === "number") {
    section.canvasColumnSpan = raw.canvasColumnSpan
  }
  return section
}

function coerceUngrouped(raw: unknown): StandaloneLinkEntry | null {
  if (!isRecord(raw)) return null
  const link = coerceLink(raw, true)
  if (!link) return null
  const position = isValidPosition(raw.position)
    ? raw.position
    : { x: 40, y: 40 }
  return { link, position }
}

function coerceSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return { ...DEFAULT_SETTINGS }
  const merged = { ...DEFAULT_SETTINGS }
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = raw[key]
    if (key === "sectionLabelSize" && typeof value === "string") {
      merged.sectionLabelSize = value as SectionLabelSize
    } else if (
      (key === "searchShortcut" || key === "settingsShortcut") &&
      typeof value === "string"
    ) {
      merged[key] = value
    } else if (
      (key === "canvasRememberScroll" ||
        key === "canvasScrollSync" ||
        key === "canvasRestoreScrollOnResize") &&
      typeof value === "boolean"
    ) {
      merged[key] = value
    }
  }
  return merged
}

function coerceLayout(raw: unknown): AppState["layoutMode"] {
  if (raw === "canvas" || raw === "list" || raw === "folders") return raw
  return "canvas"
}

/** v0 → v1: document shape matches v1; no transforms yet. */
function migrateConfigV0ToV1(doc: UnknownRecord): UnknownRecord {
  return doc
}

const CONFIG_MIGRATORS: ((doc: UnknownRecord) => UnknownRecord)[] = [
  migrateConfigV0ToV1,
]

export function migrateConfigDocument(raw: unknown): PegboardConfigDocument {
  if (!isRecord(raw)) {
    throw new Error("Config must be a YAML object or JSON object.")
  }
  let doc: UnknownRecord = { ...raw }
  let version =
    typeof doc.version === "number" && Number.isInteger(doc.version)
      ? doc.version
      : 0
  while (version < CONFIG_VERSION) {
    const migrator = CONFIG_MIGRATORS[version]
    if (!migrator) {
      throw new Error(`Unsupported config version ${version}.`)
    }
    doc = migrator(doc)
    version += 1
  }
  doc.version = CONFIG_VERSION

  const sectionsRaw = Array.isArray(doc.sections) ? doc.sections : []
  const sections: Section[] = []
  for (const item of sectionsRaw) {
    const section = coerceSection(item)
    if (section) sections.push(section)
  }

  const ungroupedRaw = Array.isArray(doc.ungrouped) ? doc.ungrouped : []
  const standaloneLinks: StandaloneLinkEntry[] = []
  for (const item of ungroupedRaw) {
    const entry = coerceUngrouped(item)
    if (entry) standaloneLinks.push(entry)
  }

  return {
    version: CONFIG_VERSION,
    layout: coerceLayout(doc.layout),
    theme: parseTheme(doc.theme),
    settings: coerceSettings(doc.settings),
    sections,
    ungrouped: standaloneLinks.map((e) => ({
      ...e.link,
      position: e.position,
    })),
  }
}

export function configDocumentToAppState(doc: PegboardConfigDocument): AppState {
  const standaloneLinks: StandaloneLinkEntry[] = doc.ungrouped.map((item) => {
    const { position, ...linkFields } = item
    return {
      link: linkFields as Link,
      position,
    }
  })
  return normalizeAppState({
    sections: doc.sections,
    standaloneLinks,
    layoutMode: doc.layout,
    editMode: false,
    settings: doc.settings,
  })
}

export function appStateToConfigDocument(
  state: AppState,
  theme?: PegboardTheme
): PegboardConfigDocument {
  return {
    version: CONFIG_VERSION,
    layout: state.layoutMode,
    ...(theme ? { theme } : {}),
    settings: state.settings,
    sections: state.sections,
    ungrouped: state.standaloneLinks.map(({ link, position }) => ({
      ...link,
      position,
    })),
  }
}

export type ParseConfigResult =
  | { ok: true; appState: AppState; theme?: PegboardTheme }
  | { ok: false; error: string }

function parseStructuredConfig(raw: unknown): ParseConfigResult {
  try {
    const doc = migrateConfigDocument(raw)
    const appState = configDocumentToAppState(doc)
    return { ok: true, appState, theme: doc.theme }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid config."
    return { ok: false, error: message }
  }
}

export function parseConfigText(text: string): ParseConfigResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, error: "File is empty." }
  }

  if (!trimmed.startsWith("{")) {
    return {
      ok: false,
      error: "Use parseConfigTextAsync for YAML files.",
    }
  }

  try {
    return parseStructuredConfig(JSON.parse(trimmed) as unknown)
  } catch {
    return { ok: false, error: "Invalid JSON." }
  }
}

export async function parseConfigTextAsync(
  text: string
): Promise<ParseConfigResult> {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, error: "File is empty." }
  }

  if (trimmed.startsWith("{")) {
    try {
      return parseStructuredConfig(JSON.parse(trimmed) as unknown)
    } catch {
      return { ok: false, error: "Invalid JSON." }
    }
  }

  const YAML = await import("yaml")
  try {
    const raw = YAML.parse(trimmed)
    return parseStructuredConfig(raw)
  } catch {
    return { ok: false, error: "Invalid YAML." }
  }
}

export async function serializeConfigYaml(
  state: AppState,
  theme?: PegboardTheme
): Promise<string> {
  const YAML = await import("yaml")
  const doc = appStateToConfigDocument(state, theme)
  const header = "# PegBoard config\n"
  return (
    header +
    YAML.stringify(doc, {
      lineWidth: 0,
    })
  )
}

export function downloadConfigYaml(content: string, filename = "pegboard.yml") {
  const blob = new Blob([content], { type: "application/x-yaml;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
