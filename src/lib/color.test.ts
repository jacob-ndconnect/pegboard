import { describe, expect, it } from "vitest"
import {
  OFF_BLACK,
  OFF_WHITE,
  PAGE_BACKGROUND_DARK,
  PAGE_BACKGROUND_LIGHT,
  contrastRatio,
  ensureForegroundContrast,
  getContrastColor,
  parseHexColor,
} from "@/lib/color"

describe("getContrastColor", () => {
  it("picks off-black on light fills and off-white on dark fills", () => {
    expect(getContrastColor("#ffffff")).toBe(OFF_BLACK)
    expect(getContrastColor("#facc15")).toBe(OFF_BLACK)
    expect(getContrastColor("#000000")).toBe(OFF_WHITE)
    expect(getContrastColor("#1e3a8a")).toBe(OFF_WHITE)
  })
})

describe("ensureForegroundContrast", () => {
  it("darkens a light accent on a light page", () => {
    const adjusted = ensureForegroundContrast("#fde68a", PAGE_BACKGROUND_LIGHT)
    const rgb = parseHexColor(adjusted)
    expect(rgb).not.toBeNull()
    expect(contrastRatio(rgb!, PAGE_BACKGROUND_LIGHT)).toBeGreaterThanOrEqual(4.5)
    const original = parseHexColor("#fde68a")!
    expect(rgb!.r + rgb!.g + rgb!.b).toBeLessThan(
      original.r + original.g + original.b
    )
  })

  it("lightens a dark accent on a dark page", () => {
    const adjusted = ensureForegroundContrast("#1e293b", PAGE_BACKGROUND_DARK)
    const rgb = parseHexColor(adjusted)
    expect(rgb).not.toBeNull()
    expect(contrastRatio(rgb!, PAGE_BACKGROUND_DARK)).toBeGreaterThanOrEqual(4.5)
    const original = parseHexColor("#1e293b")!
    expect(rgb!.r + rgb!.g + rgb!.b).toBeGreaterThan(
      original.r + original.g + original.b
    )
  })

  it("leaves an accent that already contrasts", () => {
    expect(ensureForegroundContrast("#2563eb", PAGE_BACKGROUND_LIGHT)).toBe(
      "#2563eb"
    )
    expect(ensureForegroundContrast("#93c5fd", PAGE_BACKGROUND_DARK)).toBe(
      "#93c5fd"
    )
  })
})
