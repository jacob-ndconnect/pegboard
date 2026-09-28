import { describe, expect, it } from "vitest"
import { faviconCandidateUrls, usableFaviconUrl } from "./favicon"

describe("faviconCandidateUrls", () => {
  it("tries a preferred icon, then DuckDuckGo", () => {
    expect(
      faviconCandidateUrls("https://example.com/docs", {
        preferred: "https://example.com/favicon.ico",
        cachedFirst: true,
      })
    ).toEqual([
      "https://example.com/favicon.ico",
      "https://icons.duckduckgo.com/ip3/example.com.ico",
    ])
  })

  it("keeps DuckDuckGo first outside the popup", () => {
    expect(faviconCandidateUrls("https://example.com")[0]).toBe(
      "https://icons.duckduckgo.com/ip3/example.com.ico"
    )
  })
})

describe("usableFaviconUrl", () => {
  it("drops chrome-internal favicon urls", () => {
    expect(usableFaviconUrl("chrome://favicon2/?pageUrl=https://example.com")).toBeUndefined()
    expect(usableFaviconUrl("https://example.com/favicon.ico")).toBe(
      "https://example.com/favicon.ico"
    )
  })
})
