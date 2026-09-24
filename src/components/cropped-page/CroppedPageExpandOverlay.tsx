import { useEffect, useRef, useState } from "react"
import type { CroppedPage } from "@/types"
import { CroppedPageHeader } from "./CroppedPageHeader"
import {
  croppedPageSlotElement,
  registerCroppedPageSlot,
} from "./croppedPageSlots"
import { cn } from "@/lib/utils"

const MARGIN = 12
const TOP_OFFSET = 56
const DURATION_MS = 280

type CroppedPageExpandOverlayProps = {
  page: CroppedPage
  originRect: DOMRect | null
  onClose: () => void
  onEdit: (originRect: DOMRect) => void
}

type Phase = "from" | "open" | "to"

function targetFrameRect(): DOMRect {
  const left = MARGIN
  const top = TOP_OFFSET
  const width = window.innerWidth - MARGIN * 2
  const height = window.innerHeight - top - MARGIN
  return new DOMRect(left, top, width, height)
}

export function CroppedPageExpandOverlay({
  page,
  originRect,
  onClose,
  onEdit,
}: CroppedPageExpandOverlayProps) {
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [target] = useState(targetFrameRect)
  const [closeRect, setCloseRect] = useState<DOMRect | null>(null)
  const [phase, setPhase] = useState<Phase>(
    reducedMotion || !originRect ? "open" : "from"
  )

  useEffect(() => {
    const scroller = document.querySelector("[data-canvas-scroll]")
    if (!(scroller instanceof HTMLElement)) return
    const top = scroller.scrollTop
    const left = scroller.scrollLeft
    const pin = () => {
      if (scroller.scrollTop !== top) scroller.scrollTop = top
      if (scroller.scrollLeft !== left) scroller.scrollLeft = left
    }
    scroller.addEventListener("scroll", pin)
    return () => scroller.removeEventListener("scroll", pin)
  }, [])

  useEffect(() => {
    if (reducedMotion || !originRect) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("open"))
    })
    return () => cancelAnimationFrame(id)
  }, [originRect, reducedMotion])

  const requestClose = () => {
    if (reducedMotion || !originRect || phase === "to") {
      onClose()
      return
    }
    const card = croppedPageSlotElement(page.id, "canvas")?.parentElement
    const live = card?.getBoundingClientRect()
    setCloseRect(
      live ? new DOMRect(live.x, live.y, live.width, live.height) : originRect
    )
    setPhase("to")
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      event.stopPropagation()
      requestClose()
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  })

  useEffect(() => {
    if (phase !== "to") return
    const timeout = window.setTimeout(onClose, DURATION_MS + 40)
    return () => window.clearTimeout(timeout)
  }, [phase, onClose])

  const shown =
    phase === "open" ? target : phase === "to" ? (closeRect ?? originRect ?? target) : (originRect ?? target)

  return (
    <div className="fixed inset-0 z-[220]" role="dialog">
      <div
        className={cn(
          "absolute inset-0 bg-black/40",
          !reducedMotion && "transition-opacity duration-200",
          phase === "open" ? "opacity-100" : "opacity-0"
        )}
        onClick={requestClose}
      />
      <div
        className={cn(
          "absolute flex flex-col overflow-hidden shadow-xl",
          !reducedMotion &&
            "transition-[left,top,width,height] duration-300 ease-out"
        )}
        style={{
          left: shown.left,
          top: shown.top,
          width: shown.width,
          height: shown.height,
        }}
        onTransitionEnd={(event) => {
          if (event.propertyName !== "width" || phase !== "to") return
          onClose()
        }}
      >
        <div className="shrink-0 bg-background">
          <CroppedPageHeader
          url={page.url}
          label={page.label}
          accentColor={page.accentColor}
          onEdit={() => onEdit(panelRef.current?.getBoundingClientRect() ?? originRect ?? new DOMRect())}
          onCollapse={requestClose}
        />
        </div>
        <div
          ref={(node) => {
            panelRef.current = node
            registerCroppedPageSlot(page.id, "expanded", node)
          }}
          className="pointer-events-none relative min-h-0 flex-1 overflow-hidden"
          style={{ outline: `1px solid ${page.accentColor}` }}
        />
      </div>
    </div>
  )
}
