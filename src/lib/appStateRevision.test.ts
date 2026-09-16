import { describe, expect, it } from "vitest"
import type { AppState } from "@/types"
import { DEFAULT_APP_STATE } from "@/lib/defaultAppState"
import {
  boardItemCount,
  isAuthoritativeSync,
  preferIncoming,
  stampAppState,
} from "@/lib/appStateRevision"

function board(partial: Partial<AppState>): AppState {
  return { ...DEFAULT_APP_STATE, ...partial }
}

const populated = board({
  sections: [
    {
      id: "s1",
      name: "Work",
      accentColor: "#000",
      links: [
        { id: "l1", url: "https://a.com", label: "A" },
      ],
      position: { x: 0, y: 0 },
    },
  ],
})

describe("isAuthoritativeSync", () => {
  it("treats empty unstamped state as not yet synced", () => {
    expect(isAuthoritativeSync(undefined)).toBe(false)
    expect(isAuthoritativeSync(DEFAULT_APP_STATE)).toBe(false)
    expect(isAuthoritativeSync(board({ updatedAt: 1 }))).toBe(true)
    expect(isAuthoritativeSync(populated)).toBe(true)
  })
})

describe("stampAppState", () => {
  it("never goes backward when the clock does", () => {
    const stamped = stampAppState(board({ updatedAt: 1000 }), 50)
    expect(stamped.updatedAt).toBe(1001)
  })
})

describe("preferIncoming", () => {
  it("keeps a legacy populated board over a blank snapshot", () => {
    expect(
      preferIncoming(board({ updatedAt: Date.now() }), populated, "ready")
    ).toBe(false)
  })

  it("lets a stamped empty board win after a stamped populated board (user cleared)", () => {
    const full = board({ ...populated, updatedAt: 100 })
    const empty = board({ updatedAt: 200 })
    expect(preferIncoming(empty, full, "ready")).toBe(true)
  })

  it("keeps a populated board when an older empty snapshot arrives", () => {
    const full = board({ ...populated, updatedAt: 200 })
    const empty = board({ updatedAt: 100 })
    expect(preferIncoming(empty, full, "ready")).toBe(false)
  })

  it("applies a legacy populated board over a stamped empty one", () => {
    expect(
      preferIncoming(populated, board({ updatedAt: 999 }), "ready")
    ).toBe(true)
  })

  it("uses updatedAt when both boards have content", () => {
    const older = board({ ...populated, updatedAt: 100 })
    const newer = board({
      ...populated,
      sections: [],
      standaloneLinks: [
        {
          link: { id: "x", url: "https://b.com", label: "B" },
          position: { x: 1, y: 1 },
        },
      ],
      updatedAt: 200,
    })
    expect(preferIncoming(newer, older, "ready")).toBe(true)
    expect(preferIncoming(older, newer, "ready")).toBe(false)
  })

  it("during hydrate prefers the larger board over a newer empty stamp", () => {
    const empty = board({ updatedAt: 999 })
    expect(preferIncoming(empty, populated, "hydrating")).toBe(false)
    expect(preferIncoming(populated, empty, "hydrating")).toBe(true)
  })
})
