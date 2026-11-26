import type { CroppedPageScroll } from "@/types"

type ScrollReadResult = { x: number; y: number } | null

function readScrollInFrame(targetName: string): ScrollReadResult {
  if (window.name !== targetName) return null
  return { x: window.scrollX, y: window.scrollY }
}

function pinScrollInFrame(targetName: string, x: number, y: number): boolean {
  if (window.name !== targetName) return false
  if ("scrollRestoration" in history) history.scrollRestoration = "manual"
  const root = document.documentElement
  root.style.scrollBehavior = "auto"
  if (document.body) document.body.style.scrollBehavior = "auto"
  const jump = () => {
    window.scrollTo({ left: x, top: y, behavior: "instant" })
  }
  jump()
  const stuck =
    Math.abs(window.scrollX - x) <= 1 && Math.abs(window.scrollY - y) <= 1
  if (!stuck) return false
  const view = window as Window & { __pegboardCutoutPinCleanup?: () => void }
  if (view.__pegboardCutoutPinCleanup) return true
  const onScroll = () => {
    if (Math.abs(window.scrollX - x) > 1 || Math.abs(window.scrollY - y) > 1) {
      root.style.scrollBehavior = "auto"
      jump()
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true })
  view.__pegboardCutoutPinCleanup = () => {
    window.removeEventListener("scroll", onScroll)
    delete view.__pegboardCutoutPinCleanup
  }
  return true
}

function unpinScrollInFrame(targetName: string): boolean {
  if (window.name !== targetName) return false
  const view = window as Window & { __pegboardCutoutPinCleanup?: () => void }
  view.__pegboardCutoutPinCleanup?.()
  return true
}

async function currentTabId(): Promise<number | null> {
  const tab = await chrome.tabs.getCurrent()
  return tab?.id ?? null
}

/**
 * Direct child frames of this tab only. `allFrames` also targets the
 * extension page and Chrome rejects the whole injection.
 * One frame at a time so a sandboxed nested frame cannot fail the rest.
 */
async function eachDirectChildFrame<A extends readonly unknown[], R>(
  func: (...args: [...A]) => R,
  args: A
): Promise<R[]> {
  const scripting = chrome.scripting
  const nav = chrome.webNavigation
  if (!scripting?.executeScript || !nav?.getAllFrames) return []
  const tabId = await currentTabId()
  if (tabId == null) return []
  const frames = await nav.getAllFrames({ tabId })
  const children =
    frames?.filter(
      (frame) =>
        frame.frameId !== 0 &&
        frame.parentFrameId === 0 &&
        /^https?:/i.test(frame.url)
    ) ?? []
  const out: R[] = []
  for (const frame of children) {
    try {
      const [entry] = await scripting.executeScript({
        target: { tabId, frameIds: [frame.frameId] },
        world: "MAIN",
        injectImmediately: true,
        func: func as (...a: unknown[]) => unknown,
        args: [...args],
      })
      if (entry?.result != null) out.push(entry.result as R)
    } catch {
      // Frame went away or cannot be scripted.
    }
  }
  return out
}

let tail: Promise<void> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task)
  tail = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

function isScroll(value: unknown): value is CroppedPageScroll {
  if (!value || typeof value !== "object") return false
  const scroll = value as CroppedPageScroll
  return (
    typeof scroll.x === "number" &&
    Number.isFinite(scroll.x) &&
    typeof scroll.y === "number" &&
    Number.isFinite(scroll.y)
  )
}

export function readCutoutFrameScroll(
  frameName: string
): Promise<CroppedPageScroll> {
  return enqueue(async () => {
    try {
      const hits = await eachDirectChildFrame(readScrollInFrame, [frameName])
      const found = hits.find(isScroll)
      if (!found) return { x: 0, y: 0 }
      return { x: Math.max(0, found.x), y: Math.max(0, found.y) }
    } catch {
      return { x: 0, y: 0 }
    }
  })
}

/** True once the frame is actually sitting on the saved scroll. */
export function pinCutoutFrameScroll(
  frameName: string,
  scroll: CroppedPageScroll
): Promise<boolean> {
  return enqueue(async () => {
    try {
      const hits = await eachDirectChildFrame(pinScrollInFrame, [
        frameName,
        scroll.x,
        scroll.y,
      ])
      return hits.some((hit) => hit === true)
    } catch {
      return false
    }
  })
}

const HOLD_MS = 8000

/** Retry until the document is tall enough for the jump to land. */
export async function holdCutoutFrameScroll(
  frameName: string,
  scroll: CroppedPageScroll,
  isStopped: () => boolean,
  isPaused: () => boolean = () => false
): Promise<void> {
  const deadline = performance.now() + HOLD_MS
  while (!isStopped() && performance.now() < deadline) {
    if (isPaused()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      continue
    }
    const stuck = await pinCutoutFrameScroll(frameName, scroll)
    if (isStopped() || isPaused()) continue
    if (stuck) return
    await new Promise((resolve) => setTimeout(resolve, 32))
  }
}

export function unpinCutoutFrameScroll(frameName: string): Promise<void> {
  return enqueue(async () => {
    try {
      await eachDirectChildFrame(unpinScrollInFrame, [frameName])
    } catch {
      // ignore
    }
  })
}
