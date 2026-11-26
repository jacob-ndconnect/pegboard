import { describe, expect, it } from "vitest"
import {
  coerceCroppedPageScroll,
  cutoutFrameCollapsed,
  openCutoutContentSize,
} from "./croppedPage"

const target = { width: 1200, height: 800 }

describe("openCutoutContentSize", () => {
  it("ignores the panel while it is still the tile", () => {
    expect(
      openCutoutContentSize({ width: 240, height: 160 }, target, {
        width: 240,
        height: 120,
      })
    ).toBeNull()
  })

  it("returns the iframe box once the panel is open", () => {
    expect(
      openCutoutContentSize(target, target, { width: 1200, height: 740 })
    ).toEqual({ width: 1200, height: 740 })
  })
})

describe("coerceCroppedPageScroll", () => {
  it("defaults missing scroll to origin", () => {
    expect(coerceCroppedPageScroll(undefined)).toEqual({ x: 0, y: 0 })
  })

  it("keeps finite non-negative values", () => {
    expect(coerceCroppedPageScroll({ x: 120, y: 840 })).toEqual({
      x: 120,
      y: 840,
    })
  })

  it("drops invalid coordinates", () => {
    expect(coerceCroppedPageScroll({ x: -5, y: NaN })).toEqual({ x: 0, y: 0 })
  })
})

describe("cutoutFrameCollapsed", () => {
  const openFrame = { width: 1200, height: 740 }

  it("flags a frame that was saved as the crop", () => {
    expect(
      cutoutFrameCollapsed(
        { width: 200, height: 80 },
        { width: 200, height: 80 },
        openFrame
      )
    ).toBe(true)
  })

  it("leaves a snippet crop on a full iframe alone", () => {
    expect(
      cutoutFrameCollapsed(
        { width: 1200, height: 740 },
        { width: 200, height: 80 },
        openFrame
      )
    ).toBe(false)
  })
})
