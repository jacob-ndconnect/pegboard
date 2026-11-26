import { useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { createPortal } from "react-dom"
import { croppedPageRevealShift, cutoutIframeName } from "@/lib/croppedPage"
import {
  holdCutoutFrameScroll,
  unpinCutoutFrameScroll,
} from "@/lib/cutoutFrameScroll"
import type { CroppedPage } from "@/types"
import { CroppedPageIframe } from "./CroppedPageIframe"
import {
  activeCroppedPageSlot,
  subscribeCroppedPageSlots,
  type CroppedPageSlotRole,
} from "./croppedPageSlots"

type CroppedPageMirrorProps = {
  page: CroppedPage
  /** Canvas section rename: the mirrored iframe fades with the rest of the board. */
  dimmed?: boolean
}

function pageShift(
  page: CroppedPage,
  role: CroppedPageSlotRole,
  rect: DOMRect
): { x: number; y: number } {
  if (role !== "canvas") {
    return croppedPageRevealShift(
      page.frame,
      page.crop,
      rect.width,
      rect.height
    )
  }
  return { x: -page.crop.x, y: -page.crop.y }
}

function applyBox(
  node: HTMLDivElement,
  inner: HTMLDivElement | null,
  page: CroppedPage,
  role: CroppedPageSlotRole,
  rect: DOMRect
): void {
  node.style.left = `${rect.left}px`
  node.style.top = `${rect.top}px`
  node.style.width = `${rect.width}px`
  node.style.height = `${rect.height}px`
  node.style.pointerEvents = role === "canvas" ? "none" : "auto"
  node.style.zIndex = role === "canvas" ? "1" : "230"
  if (!inner) return
  const shift = pageShift(page, role, rect)
  // A transformed ancestor makes Chrome size the iframe viewport to the window.
  inner.style.left = `${shift.x}px`
  inner.style.top = `${shift.y}px`
  inner.style.width = `${page.frame.width}px`
  inner.style.height = `${page.frame.height}px`
  inner.style.transform = "none"
}

export function CroppedPageMirror({
  page,
  dimmed = false,
}: CroppedPageMirrorProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const pageRef = useRef(page)
  pageRef.current = page
  const scrollReadyRef = useRef(page.scroll.x === 0 && page.scroll.y === 0)

  const revealScroll = useCallback(() => {
    scrollReadyRef.current = true
  }, [])

  useEffect(() => {
    const frameName = cutoutIframeName(page.id)
    const scroll = page.scroll
    const needsHold = scroll.x > 0 || scroll.y > 0
    let stopped = false
    let editing = activeCroppedPageSlot(page.id)?.role === "editing"

    if (!needsHold) revealScroll()
    else scrollReadyRef.current = false

    const unsubscribePin = subscribeCroppedPageSlots(() => {
      const role = activeCroppedPageSlot(page.id)?.role
      const nextEditing = role == null || role === "editing"
      if (nextEditing && !editing) {
        editing = true
        revealScroll()
        void unpinCutoutFrameScroll(frameName)
      } else if (!nextEditing && editing) {
        editing = false
      }
    })

    if (needsHold) {
      void holdCutoutFrameScroll(
        frameName,
        scroll,
        () => stopped,
        () => editing
      ).then(() => {
        if (!stopped) revealScroll()
      })
    }

    return () => {
      stopped = true
      unsubscribePin()
      void unpinCutoutFrameScroll(frameName)
    }
  }, [page.id, page.scroll.x, page.scroll.y, revealScroll])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      frame = requestAnimationFrame(tick)
      const node = boxRef.current
      const slot = activeCroppedPageSlot(page.id)
      if (!node) return
      if (!slot) {
        node.style.visibility = "hidden"
        return
      }
      node.style.visibility = "visible"
      applyBox(
        node,
        innerRef.current,
        pageRef.current,
        slot.role,
        slot.element.getBoundingClientRect()
      )
      const current = pageRef.current
      const needsScroll = current.scroll.x > 0 || current.scroll.y > 0
      const inner = innerRef.current
      if (inner) {
        inner.style.visibility =
          slot.role !== "editing" && needsScroll && !scrollReadyRef.current
            ? "hidden"
            : "visible"
      }
    }
    const unsubscribe = subscribeCroppedPageSlots(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(tick)
    })
    frame = requestAnimationFrame(tick)
    return () => {
      unsubscribe()
      cancelAnimationFrame(frame)
    }
  }, [page.id])

  return createPortal(
    <div
      ref={boxRef}
      className={cn(
        "pointer-events-none fixed overflow-hidden",
        dimmed && "opacity-20"
      )}
      style={{ visibility: "hidden" }}
    >
      <div
        ref={innerRef}
        className="absolute"
        style={{ width: page.frame.width, height: page.frame.height }}
      >
        <CroppedPageIframe
          url={page.url}
          frameName={cutoutIframeName(page.id)}
          width={page.frame.width}
          height={page.frame.height}
        />
      </div>
    </div>,
    document.body
  )
}
