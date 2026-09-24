import { describe, expect, it } from "vitest"
import { normalizeAppState } from "./normalizeAppState"
import { DEFAULT_APP_STATE } from "./defaultAppState"

describe("normalizeAppState croppedPages", () => {
  it("defaults missing croppedPages to empty array", () => {
    const state = normalizeAppState({
      ...DEFAULT_APP_STATE,
      croppedPages: undefined as unknown as [],
    })
    expect(state.croppedPages).toEqual([])
  })

  it("drops invalid cropped page entries", () => {
    const state = normalizeAppState({
      ...DEFAULT_APP_STATE,
      croppedPages: [
        {
          id: "a",
          url: "https://example.com",
          accentColor: "#fff",
          position: { x: 0, y: 0 },
          frame: { width: 800, height: 600 },
          crop: { x: 10, y: 10, width: 200, height: 100 },
          label: "Example",
        },
        { id: "bad", url: "" } as unknown as import("@/types").CroppedPage,
      ],
    })
    expect(state.croppedPages).toHaveLength(1)
    expect(state.croppedPages[0]?.id).toBe("a")
  })
})
