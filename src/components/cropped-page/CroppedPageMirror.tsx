import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { createPortal } from "react-dom"
import { croppedPageRevealShift } from "@/lib/croppedPage"
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
    return croppedPageRevealShift(page.frame, page.crop, rect.width, rect.height)
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
  inner.style.left = "0px"
  inner.style.top = "0px"
  inner.style.width = `${page.frame.width}px`
  inner.style.height = `${page.frame.height}px`
  inner.style.transform = `translate3d(${shift.x}px, ${shift.y}px, 0)`
}

export function CroppedPageMirror({
  page,
  dimmed = false,
}: CroppedPageMirrorProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const pageRef = useRef(page)
  pageRef.current = page

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
      <div ref={innerRef} className="absolute">
        <CroppedPageIframe url={page.url} interactive />
      </div>
    </div>,
    document.body
  )
}
