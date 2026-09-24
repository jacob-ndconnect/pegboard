import type { CroppedPageRect } from "@/types"
import { clampCropToFrame } from "@/lib/croppedPage"

export type CropHandle =
  | "move"
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | "n"
  | "e"
  | "s"
  | "w"

const MIN = 48

export function resizeCropFromHandle(
  start: CroppedPageRect,
  handle: Exclude<CropHandle, "move">,
  dx: number,
  dy: number,
  frameWidth: number,
  frameHeight: number
): CroppedPageRect {
  let { x, y, width, height } = start
  if (handle === "se") {
    width = Math.max(MIN, start.width + dx)
    height = Math.max(MIN, start.height + dy)
  } else if (handle === "sw") {
    width = Math.max(MIN, start.width - dx)
    height = Math.max(MIN, start.height + dy)
    x = start.x + start.width - width
  } else if (handle === "ne") {
    width = Math.max(MIN, start.width + dx)
    height = Math.max(MIN, start.height - dy)
    y = start.y + start.height - height
  } else if (handle === "nw") {
    width = Math.max(MIN, start.width - dx)
    height = Math.max(MIN, start.height - dy)
    x = start.x + start.width - width
    y = start.y + start.height - height
  } else if (handle === "e") {
    width = Math.max(MIN, start.width + dx)
  } else if (handle === "w") {
    width = Math.max(MIN, start.width - dx)
    x = start.x + start.width - width
  } else if (handle === "s") {
    height = Math.max(MIN, start.height + dy)
  } else if (handle === "n") {
    height = Math.max(MIN, start.height - dy)
    y = start.y + start.height - height
  }
  return clampCropToFrame({ x, y, width, height }, frameWidth, frameHeight)
}

export function moveCrop(
  start: CroppedPageRect,
  dx: number,
  dy: number,
  frameWidth: number,
  frameHeight: number
): CroppedPageRect {
  return clampCropToFrame(
    {
      ...start,
      x: start.x + dx,
      y: start.y + dy,
    },
    frameWidth,
    frameHeight
  )
}
