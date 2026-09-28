/** Off-white / off-black matching the theme foreground tokens in `index.css`. */
export const OFF_WHITE = "oklch(0.985 0.001 106.423)"
export const OFF_BLACK = "oklch(0.147 0.004 49.25)"

/** Inline rename: page surface fill, white text, accent as an inner border. */
export function editingLabelStyle(accentColor: string): {
  backgroundColor: string
  color: string
  boxShadow: string
} {
  return {
    backgroundColor: "var(--background)",
    color: "#fff",
    boxShadow: `inset 0 0 0 1px ${accentColor}`,
  }
}

/** WCAG AA for normal text. Icons next to labels share the same bar. */
const MIN_CONTRAST = 4.5

export type Rgb = { r: number; g: number; b: number }

export const PAGE_BACKGROUND_LIGHT: Rgb = { r: 255, g: 255, b: 255 }
export const PAGE_BACKGROUND_DARK: Rgb = oklchToRgb(0.147, 0.004, 49.25)

const OFF_WHITE_RGB = oklchToRgb(0.985, 0.001, 106.423)
const OFF_BLACK_RGB = oklchToRgb(0.147, 0.004, 49.25)

/** Text color (off-white or off-black) with the stronger contrast on `hex`. */
export function getContrastColor(hex: string): typeof OFF_WHITE | typeof OFF_BLACK {
  const rgb = parseHexColor(hex)
  if (!rgb) return OFF_WHITE
  const black = contrastRatio(OFF_BLACK_RGB, rgb)
  const white = contrastRatio(OFF_WHITE_RGB, rgb)
  return black >= white ? OFF_BLACK : OFF_WHITE
}

/**
 * Keep an accent's hue, shifting OKLCH lightness until it clears `MIN_CONTRAST`
 * against `background`. Colors that already pass are returned unchanged.
 * Dark pages lighten; light pages darken.
 */
export function ensureForegroundContrast(hex: string, background: Rgb): string {
  const rgb = parseHexColor(hex)
  if (!rgb) return hex
  if (contrastRatio(rgb, background) >= MIN_CONTRAST) return hex

  const { l, c, h } = rgbToOklch(rgb)
  const lighten = relativeLuminance(background) < 0.5
  let lo = lighten ? l : 0
  let hi = lighten ? 1 : l
  let best = oklchToRgbInGamut(lighten ? 1 : 0, c, h)

  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    const candidate = oklchToRgbInGamut(mid, c, h)
    if (contrastRatio(candidate, background) >= MIN_CONTRAST) {
      best = candidate
      if (lighten) hi = mid
      else lo = mid
    } else if (lighten) {
      lo = mid
    } else {
      hi = mid
    }
  }

  return toHex(best)
}

export function parseHexColor(hex: string): Rgb | null {
  const match = hex
    .trim()
    .replace(/^#/, "")
    .match(/^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (!match) return null

  let h = match[1]
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }

  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  }
}

export function parseCssRgb(color: string): Rgb | null {
  const match = color.match(
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?/i
  )
  if (!match) return null
  if (match[4] !== undefined) {
    const alpha = match[4].endsWith("%")
      ? Number(match[4].slice(0, -1)) / 100
      : Number(match[4])
    if (alpha === 0) return null
  }
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  }
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background)
  )
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background)
  )
  return (lighter + 0.05) / (darker + 0.05)
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function toHex({ r, g, b }: Rgb): string {
  const byte = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0")
  return `#${byte(r)}${byte(g)}${byte(b)}`
}

type Oklch = { l: number; c: number; h: number }

function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const linear = [r, g, b].map((value) => {
    const s = value / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const [lr, lg, lb] = linear
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const hue = (Math.atan2(b_, a) * 180) / Math.PI
  return { l: L, c: Math.hypot(a, b_), h: hue < 0 ? hue + 360 : hue }
}

function oklchToRgb(l: number, c: number, h: number): Rgb {
  return oklchToRgbInGamut(l, c, h)
}

function oklchToRgbInGamut(l: number, c: number, h: number): Rgb {
  let lo = 0
  let hi = Math.max(0, c)
  let best = linearSrgbToRgb(oklchToLinear(l, 0, h))

  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2
    const linear = oklchToLinear(l, mid, h)
    if (inGamut(linear)) {
      best = linearSrgbToRgb(linear)
      lo = mid
    } else {
      hi = mid
    }
  }

  return best
}

function oklchToLinear(l: number, c: number, h: number): [number, number, number] {
  const hue = (h * Math.PI) / 180
  const a = c * Math.cos(hue)
  const b = c * Math.sin(hue)
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b
  const ll = l_ ** 3
  const mm = m_ ** 3
  const ss = s_ ** 3
  return [
    4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss,
    -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss,
    -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss,
  ]
}

function inGamut([r, g, b]: [number, number, number]): boolean {
  return [r, g, b].every((channel) => channel >= -0.001 && channel <= 1.001)
}

function linearSrgbToRgb([r, g, b]: [number, number, number]): Rgb {
  const channel = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value))
    const encoded =
      clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * clamped ** (1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, encoded)) * 255)
  }
  return { r: channel(r), g: channel(g), b: channel(b) }
}
