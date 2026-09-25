import type { CroppedPage, CroppedPageRect } from "@/types"
import { isValidPosition } from "@/lib/normalizeAppState"
import { standaloneSpawnPosition } from "@/lib/standaloneSpawnPosition"

const MIN_CROP = 48

export function croppedPageLabelFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return "Page"
  }
}

function isFinitePositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0
}

function coerceRect(raw: unknown): CroppedPageRect | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as CroppedPageRect
  if (
    !isFinitePositive(r.width) ||
    !isFinitePositive(r.height) ||
    typeof r.x !== "number" ||
    typeof r.y !== "number" ||
    !Number.isFinite(r.x) ||
    !Number.isFinite(r.y) ||
    r.x < 0 ||
    r.y < 0
  ) {
    return null
  }
  return {
    x: r.x,
    y: r.y,
    width: Math.max(MIN_CROP, r.width),
    height: Math.max(MIN_CROP, r.height),
  }
}

export function coerceCroppedPage(raw: unknown): CroppedPage | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Partial<CroppedPage>
  const url = typeof r.url === "string" ? r.url.trim() : ""
  if (!url) return null
  const id =
    typeof r.id === "string" && r.id.length > 0 ? r.id : crypto.randomUUID()
  const accentColor =
    typeof r.accentColor === "string" && r.accentColor.length > 0
      ? r.accentColor
      : "#83CE6C"
  const position = isValidPosition(r.position)
    ? r.position
    : { x: 40, y: 40 }
  const frameRaw = r.frame
  if (
    !frameRaw ||
    typeof frameRaw !== "object" ||
    !isFinitePositive((frameRaw as { width?: number }).width) ||
    !isFinitePositive((frameRaw as { height?: number }).height)
  ) {
    return null
  }
  const crop = coerceRect(r.crop)
  if (!crop) return null
  const label =
    typeof r.label === "string" && r.label.trim().length > 0
      ? r.label.trim()
      : croppedPageLabelFromUrl(url)
  return {
    id,
    url,
    label,
    accentColor,
    position,
    frame: {
      width: (frameRaw as { width: number }).width,
      height: (frameRaw as { height: number }).height,
    },
    crop,
  }
}

export function normalizeCroppedPages(
  pages: CroppedPage[] | undefined
): CroppedPage[] {
  if (!Array.isArray(pages)) return []
  const out: CroppedPage[] = []
  for (const item of pages) {
    const page = coerceCroppedPage(item)
    if (page) out.push(page)
  }
  return out
}

export function croppedPageSpawnPosition(index: number): { x: number; y: number } {
  const base = standaloneSpawnPosition(index)
  return { x: base.x + 120, y: base.y }
}

export function defaultCropRect(
  frameWidth: number,
  frameHeight: number
): CroppedPageRect {
  const width = Math.min(480, Math.max(MIN_CROP, frameWidth * 0.55))
  const height = Math.min(280, Math.max(MIN_CROP, frameHeight * 0.35))
  return {
    x: Math.max(0, (frameWidth - width) / 2),
    y: Math.max(0, (frameHeight - height) / 2),
    width,
    height,
  }
}

const OPEN_PANEL_SLACK = 2

/**
 * Editor content size after the panel has opened. Null while it is still
 * animating from the tile, so save does not store that smaller box as the iframe.
 */
export function openCutoutContentSize(
  panel: { width: number; height: number },
  target: { width: number; height: number },
  content: { width: number; height: number }
): { width: number; height: number } | null {
  if (
    panel.width < target.width - OPEN_PANEL_SLACK ||
    panel.height < target.height - OPEN_PANEL_SLACK
  ) {
    return null
  }
  if (content.width < 1 || content.height < 1) return null
  return { width: content.width, height: content.height }
}

/** True when a previous save stored the iframe as the crop instead of the full page. */
export function cutoutFrameCollapsed(
  frame: { width: number; height: number },
  crop: { width: number; height: number },
  openFrame: { width: number; height: number }
): boolean {
  const matchesCrop =
    Math.abs(frame.width - crop.width) < 2 &&
    Math.abs(frame.height - crop.height) < 2
  const smallerThanEditor =
    frame.width < openFrame.width - 40 || frame.height < openFrame.height - 40
  return matchesCrop && smallerThanEditor
}

/** How far to shift the full frame so the crop meets the clip as the clip grows. */
export function croppedPageRevealShift(
  frame: { width: number; height: number },
  crop: { x: number; y: number; width: number; height: number },
  boxWidth: number,
  boxHeight: number
): { x: number; y: number } {
  const spanX = Math.max(1, frame.width - crop.width)
  const spanY = Math.max(1, frame.height - crop.height)
  const openX =
    boxWidth <= crop.width + 1
      ? 0
      : Math.min(1, Math.max(0, (boxWidth - crop.width) / spanX))
  const openY =
    boxHeight <= crop.height + 1
      ? 0
      : Math.min(1, Math.max(0, (boxHeight - crop.height) / spanY))
  return { x: -crop.x * (1 - openX), y: -crop.y * (1 - openY) }
}

export function clampCropToFrame(
  crop: CroppedPageRect,
  frameWidth: number,
  frameHeight: number
): CroppedPageRect {
  const width = Math.min(crop.width, frameWidth)
  const height = Math.min(crop.height, frameHeight)
  const x = Math.min(Math.max(0, crop.x), frameWidth - width)
  const y = Math.min(Math.max(0, crop.y), frameHeight - height)
  return { x, y, width, height }
}
