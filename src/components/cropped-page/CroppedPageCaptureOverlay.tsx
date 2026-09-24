import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ColorPickerPopover } from "@/components/ui/color-picker"
import { COLOR_SWATCHES } from "@/lib/color-swatches"
import { getContrastColor } from "@/lib/color"
import { getFaviconFallbackUrl, getFaviconUrl } from "@/lib/favicon"
import {
  clampCropToFrame,
  croppedPageLabelFromUrl,
  croppedPageRevealShift,
  defaultCropRect,
} from "@/lib/croppedPage"
import type { CroppedPage, CroppedPageRect } from "@/types"
import { CroppedPageIframe } from "./CroppedPageIframe"
import {
  CropIcon,
  FloppyDiskIcon,
  PaletteIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr"
import {
  moveCrop,
  resizeCropFromHandle,
  type CropHandle,
} from "./cropRectInteraction"
import { registerCroppedPageSlot } from "./croppedPageSlots"
import { cn } from "@/lib/utils"
import { createPortal } from "react-dom"

const MARGIN = 12
const TOP_OFFSET = 56
const DURATION_MS = 280

export type CroppedPageCaptureSession = {
  pageId: string | null
  url: string
  label: string
  accentColor: string
  existing?: CroppedPage
}

type CroppedPageCaptureOverlayProps = {
  session: CroppedPageCaptureSession
  originRect: DOMRect | null
  onSave: (page: CroppedPage) => void
  onDelete?: () => void
  onCancel: () => void
}

type Phase = "from" | "open" | "to"
type CloseAction = "save" | "cancel" | "delete"

function CropMask({
  screenCrop,
  accentColor,
  onPointerDown,
}: {
  screenCrop: { x: number; y: number; width: number; height: number }
  accentColor: string
  onPointerDown: (handle: CropHandle, event: React.PointerEvent) => void
}) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute bg-black/55"
          style={{ left: 0, top: 0, right: 0, height: screenCrop.y }}
        />
        <div
          className="absolute bg-black/55"
          style={{
            left: 0,
            top: screenCrop.y + screenCrop.height,
            right: 0,
            bottom: 0,
          }}
        />
        <div
          className="absolute bg-black/55"
          style={{
            left: 0,
            top: screenCrop.y,
            width: screenCrop.x,
            height: screenCrop.height,
          }}
        />
        <div
          className="absolute bg-black/55"
          style={{
            left: screenCrop.x + screenCrop.width,
            top: screenCrop.y,
            right: 0,
            height: screenCrop.height,
          }}
        />
      </div>
      <div
        className="absolute border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
        style={{
          left: screenCrop.x,
          top: screenCrop.y,
          width: screenCrop.width,
          height: screenCrop.height,
          borderColor: accentColor,
        }}
      >
        <div
          className="pointer-events-auto absolute inset-0 cursor-move"
          onPointerDown={(event) => onPointerDown("move", event)}
        />
        {(
          [
            ["n", "inset-x-3 top-0 h-2 -translate-y-1/2 cursor-ns-resize"],
            ["s", "inset-x-3 bottom-0 h-2 translate-y-1/2 cursor-ns-resize"],
            ["w", "inset-y-3 left-0 w-2 -translate-x-1/2 cursor-ew-resize"],
            ["e", "inset-y-3 right-0 w-2 translate-x-1/2 cursor-ew-resize"],
          ] as const
        ).map(([handle, placement]) => (
          <div
            key={handle}
            className={cn("pointer-events-auto absolute z-10", placement)}
            onPointerDown={(event) => onPointerDown(handle, event)}
          />
        ))}
        {(["nw", "ne", "sw", "se"] as const).map((handle) => (
          <div
            key={handle}
            className={cn(
              "pointer-events-auto absolute z-20 size-3 rounded-full border border-white bg-foreground/80",
              handle === "nw" && "-left-1.5 -top-1.5 cursor-nwse-resize",
              handle === "ne" && "-right-1.5 -top-1.5 cursor-nesw-resize",
              handle === "sw" && "-bottom-1.5 -left-1.5 cursor-nesw-resize",
              handle === "se" && "-bottom-1.5 -right-1.5 cursor-nwse-resize"
            )}
            onPointerDown={(event) => onPointerDown(handle, event)}
          />
        ))}
      </div>
    </>
  )
}

function targetFrameRect(): DOMRect {
  const left = MARGIN
  const top = TOP_OFFSET
  const width = window.innerWidth - MARGIN * 2
  const height = window.innerHeight - top - MARGIN
  return new DOMRect(left, top, width, height)
}

export function CroppedPageCaptureOverlay({
  session,
  originRect,
  onSave,
  onDelete,
  onCancel,
}: CroppedPageCaptureOverlayProps) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const cropLayerRef = useRef<HTMLDivElement | null>(null)
  const cropShiftRef = useRef<HTMLDivElement | null>(null)
  const existingRef = useRef(session.existing)
  existingRef.current = session.existing
  const cropInitializedRef = useRef(false)
  const closeActionRef = useRef<CloseAction | null>(null)
  const finishedRef = useRef(false)
  const [frameSize, setFrameSize] = useState({ width: 800, height: 600 })
  const frameSpace = session.existing?.frame ?? frameSize
  const [crop, setCrop] = useState<CroppedPageRect>(() =>
    session.existing?.crop ?? defaultCropRect(800, 600)
  )
  const [label, setLabel] = useState(session.label)
  const [accentColor, setAccentColor] = useState(session.accentColor)
  const [faviconError, setFaviconError] = useState(false)
  const [editorUrl, setEditorUrl] = useState(session.url)
  const [cropHidden, setCropHidden] = useState(false)
  const editorUrlRef = useRef(session.url)
  editorUrlRef.current = editorUrl
  const dragRef = useRef<{
    handle: CropHandle
    startCrop: CroppedPageRect
    startX: number
    startY: number
  } | null>(null)
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const [target] = useState(targetFrameRect)
  const [phase, setPhase] = useState<Phase>(
    reducedMotion || !originRect ? "open" : "from"
  )
  const reuseFrame = session.pageId != null

  useEffect(() => {
    if (!reuseFrame) return
    let frame = 0
    const tick = () => {
      const slot = frameRef.current
      const layer = cropLayerRef.current
      if (slot && layer) {
        const rect = slot.getBoundingClientRect()
        layer.style.left = `${rect.left}px`
        layer.style.top = `${rect.top}px`
        layer.style.width = `${rect.width}px`
        layer.style.height = `${rect.height}px`
        const existing = existingRef.current
        const shiftEl = cropShiftRef.current
        if (existing && shiftEl) {
          const shift = croppedPageRevealShift(
            existing.frame,
            existing.crop,
            rect.width,
            rect.height
          )
          shiftEl.style.width = `${existing.frame.width}px`
          shiftEl.style.height = `${existing.frame.height}px`
          shiftEl.style.transform = `translate(${shift.x}px, ${shift.y}px)`
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reuseFrame])

  useEffect(() => {
    const nav = chrome.webNavigation
    if (!nav) return
    let cancelled = false
    let tabId = -1
    let frameId: number | null = null
    const onNav = (
      details: chrome.webNavigation.WebNavigationFramedCallbackDetails
    ) => {
      if (cancelled || details.tabId !== tabId || details.frameId === 0) return
      if (frameId == null) {
        if (details.url !== editorUrlRef.current) return
        frameId = details.frameId
        return
      }
      if (details.frameId !== frameId) return
      editorUrlRef.current = details.url
      setEditorUrl(details.url)
    }
    void chrome.tabs.getCurrent().then(async (tab) => {
      if (!tab?.id || cancelled) return
      tabId = tab.id
      const frames = await nav.getAllFrames({ tabId })
      const matches =
        frames?.filter(
          (frame) => frame.frameId !== 0 && frame.url === editorUrlRef.current
        ) ?? []
      if (matches.length === 1) frameId = matches[0].frameId
    })
    nav.onCommitted.addListener(onNav)
    nav.onHistoryStateUpdated.addListener(onNav)
    return () => {
      cancelled = true
      nav.onCommitted.removeListener(onNav)
      nav.onHistoryStateUpdated.removeListener(onNav)
    }
  }, [])

  useEffect(() => {
    if (reducedMotion || !originRect) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("open"))
    })
    return () => cancelAnimationFrame(id)
  }, [originRect, reducedMotion])

  useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w > 0 && h > 0) {
        setFrameSize({ width: w, height: h })
        if (!cropInitializedRef.current && !session.existing) {
          cropInitializedRef.current = true
          setCrop(defaultCropRect(w, h))
        }
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [session.existing, session.url])

  const onPointerDown = useCallback(
    (handle: CropHandle, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      dragRef.current = {
        handle,
        startCrop: crop,
        startX: e.clientX,
        startY: e.clientY,
      }
    },
    [crop]
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (drag.handle === "move") {
        setCrop(moveCrop(drag.startCrop, dx, dy, frameSpace.width, frameSpace.height))
      } else {
        setCrop(
          resizeCropFromHandle(
            drag.startCrop,
            drag.handle,
            dx,
            dy,
            frameSpace.width,
            frameSpace.height
          )
        )
      }
    }
    const onUp = () => {
      dragRef.current = null
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [frameSpace.height, frameSpace.width])

  const finishClose = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    const action = closeActionRef.current
    if (action === "save") {
      const id = session.pageId ?? session.existing?.id ?? crypto.randomUUID()
      const position = session.existing?.position ?? { x: 120, y: 120 }
      const nextLabel = label.trim() || croppedPageLabelFromUrl(session.url)
      onSave({
        id,
        url: editorUrl,
        label: nextLabel,
        accentColor,
        position,
        frame: frameSpace,
        crop: clampCropToFrame(crop, frameSpace.width, frameSpace.height),
      })
      return
    }
    if (action === "delete") onDelete?.()
    else onCancel()
  }, [
    accentColor,
    crop,
    editorUrl,
    frameSpace,
    label,
    onCancel,
    onDelete,
    onSave,
    session,
  ])

  const requestClose = useCallback(
    (action: CloseAction) => {
      if (phase === "to") return
      closeActionRef.current = action
      if (reducedMotion || !originRect) {
        finishClose()
        return
      }
      setPhase("to")
    },
    [finishClose, originRect, phase, reducedMotion]
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (document.querySelector("[data-slot=color-picker-popover-panel]")) return
      event.preventDefault()
      event.stopPropagation()
      requestClose("cancel")
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [requestClose])

  useEffect(() => {
    if (phase !== "to") return
    const timeout = window.setTimeout(finishClose, DURATION_MS + 40)
    return () => window.clearTimeout(timeout)
  }, [finishClose, phase])

  const panelRect = originRect && phase !== "open" ? originRect : target

  return (
    <div className="fixed inset-0 z-[220]" role="dialog" aria-label="Edit cutout">
      <div
        className={cn(
          "absolute inset-0 bg-black/40",
          !reducedMotion && "transition-opacity duration-200",
          phase === "open" ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        className={cn(
          "absolute flex flex-col overflow-hidden bg-background shadow-xl",
          !reducedMotion &&
            "transition-[left,top,width,height] duration-300 ease-out"
        )}
        style={{
          left: panelRect.left,
          top: panelRect.top,
          width: panelRect.width,
          height: panelRect.height,
        }}
        onTransitionEnd={(event) => {
          if (event.propertyName !== "width" || phase !== "to") return
          finishClose()
        }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <label
              className="flex min-w-0 items-center gap-1.5 px-2 py-1 font-geist-pixel text-lg"
              style={{
                backgroundColor: accentColor,
                color: getContrastColor(accentColor),
              }}
            >
              <img
                src={
                  faviconError
                    ? getFaviconFallbackUrl(editorUrl)
                    : getFaviconUrl(editorUrl)
                }
                alt=""
                className="size-4 shrink-0"
                onError={() => setFaviconError(true)}
              />
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                aria-label="Cutout label"
                className="w-40 min-w-0 bg-transparent outline-none placeholder:text-current/60"
                placeholder="Label"
              />
            </label>
            <ColorPickerPopover
              value={accentColor}
              onValueChange={(_, parsed) => setAccentColor(parsed.hex)}
              swatches={[...COLOR_SWATCHES]}
              hideEyedropper
              panelZIndex={260}
              triggerClassName="size-8 justify-center border-0 bg-transparent p-0 hover:bg-white/10"
              trigger={
                <PaletteIcon className="size-5" style={{ color: accentColor }} />
              }
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-8 gap-1.5 rounded-none px-2"
              style={{ color: accentColor }}
              onClick={() => setCropHidden((hidden) => !hidden)}
            >
              <CropIcon className="size-4" />
              {cropHidden ? "show crop" : "hide crop"}
            </Button>
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="h-8 gap-1.5 rounded-none px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => requestClose("delete")}
              >
                <TrashIcon className="size-4" />
                delete
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-none px-2"
              style={{ color: accentColor }}
              onClick={() => requestClose("cancel")}
            >
              cancel
            </Button>
            <Button
              type="button"
              className="h-8 gap-1.5 rounded-none px-2.5"
              style={{ backgroundColor: accentColor, color: "#000" }}
              onClick={() => requestClose("save")}
            >
              save
              <FloppyDiskIcon className="size-4" />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <div
            className="relative mx-auto size-full overflow-hidden border border-border bg-transparent"
            style={{ borderColor: accentColor }}
          >
            <div
              ref={(node) => {
                frameRef.current = node
                if (reuseFrame && session.pageId) {
                  registerCroppedPageSlot(session.pageId, "editing", node)
                }
              }}
              className="relative size-full overflow-hidden"
            >
              {reuseFrame ? null : (
                <>
                  <CroppedPageIframe url={session.url} interactive />
                  {cropHidden ? null : (
                    <CropMask
                      screenCrop={crop}
                      accentColor={accentColor}
                      onPointerDown={onPointerDown}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {reuseFrame
        ? createPortal(
            <div
              ref={cropLayerRef}
              className="pointer-events-none fixed z-[240] overflow-hidden"
            >
              <div ref={cropShiftRef} className="absolute top-0 left-0">
                {cropHidden ? null : (
                  <CropMask
                    screenCrop={crop}
                    accentColor={accentColor}
                    onPointerDown={onPointerDown}
                  />
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
