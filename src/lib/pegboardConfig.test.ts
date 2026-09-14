import { describe, expect, it, vi } from "vitest"
import { parse } from "yaml"
import {
  CONFIG_VERSION,
  configDocumentToAppState,
  migrateConfigDocument,
  parseConfigText,
} from "./pegboardConfig"

describe("migrateConfigDocument", () => {
  it("treats missing version as 0 and yields current version", () => {
    const doc = migrateConfigDocument({
      layout: "list",
      settings: {},
      sections: [],
      ungrouped: [],
    })
    expect(doc.version).toBe(CONFIG_VERSION)
    expect(doc.layout).toBe("list")
  })

  it("assigns ids to links and sections when omitted", () => {
    const doc = migrateConfigDocument({
      version: 1,
      layout: "canvas",
      settings: {},
      sections: [
        {
          name: "Work",
          accentColor: "#000",
          position: { x: 1, y: 2 },
          links: [{ url: "https://a.com", label: "A" }],
        },
      ],
      ungrouped: [
        {
          url: "https://b.com",
          label: "B",
          position: { x: 10, y: 20 },
        },
      ],
    })
    expect(doc.sections[0]?.id).toBeTruthy()
    expect(doc.sections[0]?.links[0]?.id).toBeTruthy()
    expect(doc.ungrouped[0]?.id).toBeTruthy()
  })
})

describe("configDocumentToAppState", () => {
  it("normalizes imported state with editMode false", () => {
    const doc = migrateConfigDocument({
      version: 1,
      layout: "folders",
      settings: { searchShortcut: "Mod+/" },
      sections: [],
      ungrouped: [],
    })
    const state = configDocumentToAppState(doc)
    expect(state.editMode).toBe(false)
    expect(state.layoutMode).toBe("folders")
    expect(state.settings.searchShortcut).toBe("Mod+/")
    expect(state.settings.settingsShortcut).toBeTruthy()
  })
})

describe("parseConfigText", () => {
  it("parses JSON config", () => {
    const result = parseConfigText(
      JSON.stringify({
        version: 1,
        layout: "canvas",
        settings: {},
        sections: [],
        ungrouped: [],
      })
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.appState.layoutMode).toBe("canvas")
    }
  })
})

describe("YAML round-trip shape", () => {
  it("parses minimal YAML via migrate", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "test-uuid",
    })
    const raw = parse(`
version: 1
layout: canvas
settings:
  searchShortcut: Mod+K
sections: []
ungrouped: []
`)
    const doc = migrateConfigDocument(raw)
    expect(doc.settings.searchShortcut).toBe("Mod+K")
  })
})
