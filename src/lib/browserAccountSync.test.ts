import { describe, expect, it } from "vitest"
import type { AppState } from "@/types"
import { DEFAULT_APP_STATE } from "@/lib/defaultAppState"
import { resolveAccountSyncFlag } from "@/lib/browserAccountSync"

function board(partial: Partial<AppState>): AppState {
  return { ...DEFAULT_APP_STATE, ...partial }
}

const populated = board({
  updatedAt: 1,
  sections: [
    {
      id: "s1",
      name: "Work",
      accentColor: "#000",
      links: [],
      position: { x: 0, y: 0 },
    },
  ],
})

describe("resolveAccountSyncFlag", () => {
  it("grandfathers on when the flag is absent but a board exists", () => {
    expect(resolveAccountSyncFlag(undefined, populated, undefined)).toEqual({
      effective: true,
      shouldPersistFlag: true,
    })
    expect(resolveAccountSyncFlag(undefined, undefined, populated)).toEqual({
      effective: true,
      shouldPersistFlag: true,
    })
  })

  it("defaults off when the flag is absent and there is no board", () => {
    expect(resolveAccountSyncFlag(undefined, undefined, undefined)).toEqual({
      effective: false,
      shouldPersistFlag: false,
    })
    expect(resolveAccountSyncFlag(undefined, DEFAULT_APP_STATE, undefined)).toEqual(
      {
        effective: false,
        shouldPersistFlag: false,
      }
    )
  })

  it("honors an explicit stored flag", () => {
    expect(resolveAccountSyncFlag(true, undefined, undefined)).toEqual({
      effective: true,
      shouldPersistFlag: false,
    })
    expect(resolveAccountSyncFlag(false, populated, populated)).toEqual({
      effective: false,
      shouldPersistFlag: false,
    })
  })
})