import { useSyncExternalStore } from "react"
import {
  ensureForegroundContrast,
  PAGE_BACKGROUND_DARK,
  PAGE_BACKGROUND_LIGHT,
  parseCssRgb,
  type Rgb,
} from "@/lib/color"

const listeners = new Set<() => void>()
let pageBackground = PAGE_BACKGROUND_LIGHT
let cacheKey = ""
let observer: MutationObserver | null = null

function readPageBackgroundRgb(): Rgb {
  const dark = document.documentElement.classList.contains("dark")
  const parsed = parseCssRgb(getComputedStyle(document.body).backgroundColor)
  if (!parsed) return dark ? PAGE_BACKGROUND_DARK : PAGE_BACKGROUND_LIGHT
  return parsed
}

function getPageBackground() {
  if (typeof document === "undefined") return pageBackground
  const key = document.documentElement.className
  if (key !== cacheKey) {
    cacheKey = key
    pageBackground = readPageBackgroundRgb()
  }
  return pageBackground
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!observer) {
    observer = new MutationObserver(() => {
      cacheKey = ""
      for (const notify of listeners) notify()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && observer) {
      observer.disconnect()
      observer = null
    }
  }
}

/** Accent hex nudged so it stays readable on the page background. */
export function useReadableAccent(hex: string): string {
  const background = useSyncExternalStore(
    subscribe,
    getPageBackground,
    () => PAGE_BACKGROUND_LIGHT
  )
  return ensureForegroundContrast(hex, background)
}
