import { describe, expect, it } from "vitest"
import {
  parseWhatsNewMarkdown,
  shouldShowWhatsNewChip,
} from "./whatsNew"

describe("parseWhatsNewMarkdown", () => {
  it("parses frontmatter id, title, and body", () => {
    const raw = `---
id: 2
title: Updates
---

## Hello
World
`
    const parsed = parseWhatsNewMarkdown(raw)
    expect(parsed.id).toBe(2)
    expect(parsed.title).toBe("Updates")
    expect(parsed.bodyMarkdown).toContain("## Hello")
  })

  it("throws when id is missing or invalid", () => {
    expect(() =>
      parseWhatsNewMarkdown(`---
title: X
---
body`)
    ).toThrow(/id/)
  })
})

describe("shouldShowWhatsNewChip", () => {
  it("shows when seen id differs from announcement", () => {
    expect(shouldShowWhatsNewChip(undefined, 1)).toBe(true)
    expect(shouldShowWhatsNewChip(0, 1)).toBe(true)
    expect(shouldShowWhatsNewChip(1, 1)).toBe(false)
  })
})
