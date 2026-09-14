import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react"
import {
  applyScrollToWorldCenter,
  applyViewportPad,
  readCanvasScrollAnchor,
  viewportPadFromScrollEl,
  worldCenterFromViewport,
  writeCanvasScrollAnchor,
} from "@/lib/canvasScrollAnchor"

const DEBOUNCE_MS = 200

type UseCanvasScrollAnchorOptions = {
  scrollRef: RefObject<HTMLElement | null>
  padRef: RefObject<HTMLElement | null>
  contentRef: RefObject<HTMLElement | null>
  remember: boolean
  useSync: boolean
  restoreOnResize: boolean
}

export function useCanvasScrollAnchor({
  scrollRef,
  padRef,
  contentRef,
  remember,
  useSync,
  restoreOnResize,
}: UseCanvasScrollAnchorOptions) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Board-space point that should sit at the viewport center. Never replaced by a clamped read. */
  const lastWorldCenterRef = useRef<{ centerX: number; centerY: number } | null>(
    null
  )
  const applyingRef = useRef(false)
  const reclampRafRef = useRef<number>(0)

  const padAndApply = useCallback(
    (worldX: number, worldY: number) => {
      const scrollEl = scrollRef.current
      const padEl = padRef.current
      if (!scrollEl || !padEl) return
      applyingRef.current = true
      const pad = viewportPadFromScrollEl(scrollEl)
      applyViewportPad(padEl, pad)
      applyScrollToWorldCenter(scrollEl, worldX, worldY, pad)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          applyingRef.current = false
        })
      })
    },
    [scrollRef, padRef]
  )

  const persistNow = useCallback(() => {
    const el = scrollRef.current
    if (!el || !remember || applyingRef.current) return
    const pad = viewportPadFromScrollEl(el)
    const anchor = worldCenterFromViewport(el, pad)
    lastWorldCenterRef.current = anchor
    writeCanvasScrollAnchor(anchor, useSync)
  }, [remember, useSync, scrollRef])

  const schedulePersist = useCallback(() => {
    if (!remember) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      persistNow()
    }, DEBOUNCE_MS)
  }, [remember, persistNow])

  const scheduleReclampForResize = useCallback(() => {
    if (reclampRafRef.current) cancelAnimationFrame(reclampRafRef.current)
    reclampRafRef.current = requestAnimationFrame(() => {
      reclampRafRef.current = 0
      requestAnimationFrame(() => {
        const scrollEl = scrollRef.current
        const padEl = padRef.current
        if (!scrollEl || !padEl) return
        const c = lastWorldCenterRef.current
        if (!c) return
        padAndApply(c.centerX, c.centerY)
      })
    })
  }, [scrollRef, padRef, padAndApply])

  useEffect(() => {
    if (!remember) return

    let cancelled = false

    const run = async () => {
      const anchor = await readCanvasScrollAnchor(useSync)
      if (cancelled || !scrollRef.current || !contentRef.current) return
      const apply = () => {
        if (cancelled || !scrollRef.current || !contentRef.current) return
        const board = contentRef.current
        const target = anchor ?? {
          centerX: board.offsetWidth / 2,
          centerY: board.offsetHeight / 2,
        }
        lastWorldCenterRef.current = target
        padAndApply(target.centerX, target.centerY)
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(apply)
      })
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [remember, useSync, scrollRef, contentRef, padAndApply])

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current
    const padEl = padRef.current
    if (!scrollEl || !padEl) return
    const syncPad = () => {
      applyViewportPad(padEl, viewportPadFromScrollEl(scrollEl))
    }
    syncPad()
    const ro = new ResizeObserver(syncPad)
    ro.observe(scrollEl)
    window.addEventListener("resize", syncPad, { passive: true })
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", syncPad)
    }
  }, [scrollRef, padRef])

  useLayoutEffect(() => {
    if (!remember) return
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      if (applyingRef.current) return
      const pad = viewportPadFromScrollEl(el)
      lastWorldCenterRef.current = worldCenterFromViewport(el, pad)
      schedulePersist()
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      el.removeEventListener("scroll", onScroll)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [remember, schedulePersist, scrollRef])

  useEffect(() => {
    const flush = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      persistNow()
    }
    const onVis = () => {
      if (document.visibilityState === "hidden") flush()
    }
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("pagehide", flush)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("pagehide", flush)
    }
  }, [persistNow])

  useLayoutEffect(() => {
    if (!remember || !restoreOnResize) return
    const scrollEl = scrollRef.current
    const boardEl = contentRef.current
    if (!scrollEl || !boardEl) return

    const ro = new ResizeObserver(scheduleReclampForResize)
    ro.observe(scrollEl)
    ro.observe(boardEl)
    window.addEventListener("resize", scheduleReclampForResize, { passive: true })

    return () => {
      ro.disconnect()
      window.removeEventListener("resize", scheduleReclampForResize)
      if (reclampRafRef.current) cancelAnimationFrame(reclampRafRef.current)
    }
  }, [remember, restoreOnResize, scrollRef, contentRef, scheduleReclampForResize])
}
