import { describe, expect, it } from "vitest"
import { DEFAULT_APP_STATE } from "@/lib/defaultAppState"
import { appendStandalonePin } from "@/lib/appendStandalonePin"
import { readToolbarCutoutIntent } from "@/lib/toolbarCutout"

describe("readToolbarCutoutIntent", () => {
  it("reads an http url and label", () => {
    expect(
      readToolbarCutoutIntent(
        "?cutout=https%3A%2F%2Fexample.com%2Fdocs&cutoutLabel=Docs"
      )
    ).toEqual({ url: "https://example.com/docs", label: "Docs" })
  })

  it("rejects non-http pages", () => {
    expect(readToolbarCutoutIntent("?cutout=chrome%3A%2F%2Fnewtab")).toBeNull()
  })
})

describe("appendStandalonePin details", () => {
  it("stores search terms, badge, and invert", () => {
    const outcome = appendStandalonePin(
      DEFAULT_APP_STATE,
      "https://example.com/a",
      "Example",
      {
        searchTerms: "docs",
        badge: { emoji: "🚀", color: "#ffffff" },
        invertIcon: true,
      }
    )
    expect(outcome).not.toBe("invalid")
    expect(outcome).not.toBe("duplicate")
    if (outcome === "invalid" || outcome === "duplicate") return
    expect(outcome.next.standaloneLinks[0]?.link).toMatchObject({
      url: "https://example.com/a",
      label: "Example",
      searchTerms: "docs",
      badge: { emoji: "🚀", color: "#ffffff" },
      invertIcon: true,
    })
  })
})
