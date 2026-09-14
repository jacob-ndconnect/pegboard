/// <reference types="chrome" />

export const CANVAS_SCROLL_ANCHOR_STORAGE_KEY = "canvasScrollAnchor"

export type CanvasScrollAnchor = {
  /** Point on the placement board (item space), not including viewport pad. */
  centerX: number
  centerY: number
}

export function parseCanvasScrollAnchor(
  raw: unknown
): CanvasScrollAnchor | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const { centerX, centerY } = o
  if (typeof centerX !== "number" || typeof centerY !== "number") return null
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return null
  return { centerX, centerY }
}

function getFromArea(
  area: "local" | "sync"
): Promise<CanvasScrollAnchor | null> {
  return new Promise((resolve) => {
    chrome.storage[area].get(CANVAS_SCROLL_ANCHOR_STORAGE_KEY, (result) => {
      const parsed = parseCanvasScrollAnchor(
        result[CANVAS_SCROLL_ANCHOR_STORAGE_KEY]
      )
      resolve(parsed)
    })
  })
}

/** When preferSync is true, try sync first, then fall back to local. Otherwise local only. */
export function readCanvasScrollAnchor(
  preferSync: boolean
): Promise<CanvasScrollAnchor | null> {
  if (preferSync) {
    return getFromArea("sync").then((sync) => sync ?? getFromArea("local"))
  }
  return getFromArea("local")
}

/** Always writes local; mirrors to sync when useSync is true. */
export function writeCanvasScrollAnchor(
  anchor: CanvasScrollAnchor,
  useSync: boolean
): void {
  const payload = { [CANVAS_SCROLL_ANCHOR_STORAGE_KEY]: anchor }
  chrome.storage.local.set(payload)
  if (useSync) {
    chrome.storage.sync.set(payload)
  }
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

export type ViewportPad = { x: number; y: number }

/** Half the scrollport — enough to put any board point at the viewport center. */
export function viewportPadFromScrollEl(scrollEl: HTMLElement): ViewportPad {
  return {
    x: scrollEl.clientWidth / 2,
    y: scrollEl.clientHeight / 2,
  }
}

export function applyViewportPad(
  padEl: HTMLElement,
  pad: ViewportPad
): void {
  padEl.style.paddingLeft = `${pad.x}px`
  padEl.style.paddingRight = `${pad.x}px`
  padEl.style.paddingTop = `${pad.y}px`
  padEl.style.paddingBottom = `${pad.y}px`
}

export function applyScrollToWorldCenter(
  scrollEl: HTMLElement,
  worldX: number,
  worldY: number,
  pad: ViewportPad
): void {
  const maxL = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth)
  const maxT = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
  scrollEl.scrollLeft = clamp(worldX + pad.x - scrollEl.clientWidth / 2, 0, maxL)
  scrollEl.scrollTop = clamp(worldY + pad.y - scrollEl.clientHeight / 2, 0, maxT)
}

export function worldCenterFromViewport(
  scrollEl: HTMLElement,
  pad: ViewportPad
): CanvasScrollAnchor {
  return {
    centerX: scrollEl.scrollLeft + scrollEl.clientWidth / 2 - pad.x,
    centerY: scrollEl.scrollTop + scrollEl.clientHeight / 2 - pad.y,
  }
}

export function measureCanvasBoardSize(
  boardEl: HTMLElement,
  slack = 80
): { width: number; height: number } {
  const rootRect = boardEl.getBoundingClientRect()
  let maxX = 0
  let maxY = 0
  for (const child of boardEl.children) {
    if (!(child instanceof HTMLElement)) continue
    if (child.dataset.canvasChrome === "true") continue
    const r = child.getBoundingClientRect()
    maxX = Math.max(maxX, r.right - rootRect.left)
    maxY = Math.max(maxY, r.bottom - rootRect.top)
  }
  return {
    width: Math.max(Math.ceil(maxX + slack), 1),
    height: Math.max(Math.ceil(maxY + slack), 1),
  }
}
