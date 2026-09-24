import { describe, expect, it } from "vitest"
import { resizeCropFromHandle } from "./cropRectInteraction"

const start = { x: 40, y: 30, width: 200, height: 120 }

describe("resizeCropFromHandle edges", () => {
  it("drags the east and north edges without moving the opposite side", () => {
    expect(resizeCropFromHandle(start, "e", 25, 0, 800, 600)).toEqual({
      x: 40,
      y: 30,
      width: 225,
      height: 120,
    })
    expect(resizeCropFromHandle(start, "n", 0, 15, 800, 600)).toEqual({
      x: 40,
      y: 45,
      width: 200,
      height: 105,
    })
  })
})
