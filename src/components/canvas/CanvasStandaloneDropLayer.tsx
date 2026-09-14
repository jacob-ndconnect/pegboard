import { useDroppable } from "@dnd-kit/core"
import { createPortal } from "react-dom"
import { DROP_STANDALONE_ID } from "@/components/dnd/linkDragIds"
import { isActiveSectionLinkDrag } from "@/components/dnd/isActiveLinkDrag"

/** Below fixed toolbar (`z-40` in App); dim + label above canvas sections via portal. */
const OVERLAY_TOP = "top-[5.5rem]"
const OVERLAY_Z_DIM = "z-[30]"
const OVERLAY_Z_LABEL = "z-[35]"

/** Full-bleed drop target behind sections so links can be moved to ungrouped (canvas). */
export function CanvasStandaloneDropLayer() {
  const { setNodeRef, isOver, active } = useDroppable({
    id: DROP_STANDALONE_ID,
    data: { kind: "canvas-standalone-drop" as const },
  })

  const showOverlay = isOver && isActiveSectionLinkDrag(active)

  return (
    <>
      <div
        ref={setNodeRef}
        data-canvas-chrome="true"
        className="pointer-events-auto absolute inset-0 z-0"
        aria-hidden
      />
      {showOverlay
        ? createPortal(
            <>
              <div
                className={`pointer-events-none fixed inset-x-0 bottom-0 ${OVERLAY_TOP} ${OVERLAY_Z_DIM} bg-background/45`}
                aria-hidden
              />
              <div
                className={`pointer-events-none fixed left-1/2 ${OVERLAY_TOP} ${OVERLAY_Z_LABEL} flex -translate-x-1/2 justify-center pt-2`}
                role="status"
                aria-live="polite"
              >
                <span className="rounded-lg border border-border bg-background/95 px-4 py-2 text-sm font-medium text-foreground shadow-md">
                  Move outside sections
                </span>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  )
}
