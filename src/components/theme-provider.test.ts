import { describe, expect, it } from "vitest"
import { nextLightDarkTheme } from "./theme-provider"

describe("nextLightDarkTheme", () => {
  it("flips explicit light and dark", () => {
    expect(nextLightDarkTheme("dark", "dark")).toBe("light")
    expect(nextLightDarkTheme("light", "light")).toBe("dark")
  })

  it("flips away from the current system theme", () => {
    expect(nextLightDarkTheme("system", "dark")).toBe("light")
    expect(nextLightDarkTheme("system", "light")).toBe("dark")
  })
})
