import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { useCanvasPointerPan } from "@/hooks/useCanvasPointerPan"
import { useCanvasScrollAnchor } from "@/hooks/useCanvasScrollAnchor"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import {
  DROP_STANDALONE_ID,
  FLOATING_LINK_ID_PREFIX,
  parseSectionLinkDragId,
} from "@/components/dnd/linkDragIds"
import { preferSectionOverStandalone } from "@/components/dnd/preferSectionDropCollision"
import { applyLinkDragEnd } from "@/lib/applyLinkDragEnd"
import { getDefaultCanvasSectionPosition } from "@/lib/canvasGrid"
import { standalonePositionFromTranslatedRect } from "@/lib/canvasDropPosition"
import { measureCanvasBoardSize } from "@/lib/canvasScrollAnchor"
import { CanvasStandaloneDropLayer } from "./CanvasStandaloneDropLayer"
import { FloatingLinkCard } from "./FloatingLinkCard"
import { SectionFrame } from "./SectionFrame"
import { cn } from "@/lib/utils"
import type { AppState, Section, StandaloneLinkEntry } from "@/types"

/** `true` = drag only while edit mode is on. `false` = sections stay draggable in view mode (intended; handle shows on hover). */
const DRAGGABLE_ONLY_IN_EDIT = false

type CanvasProps = {
  state: AppState
  save: (newStateOrUpdater: AppState | ((prev: AppState) => AppState)) => void
  onEditSection: (section: Section) => void
  onEditLink: (sectionId: string, linkId: string) => void
  onAddLink: (sectionId: string) => void
  onEditStandaloneLink: (linkId: string) => void
}

const DEFAULT_POSITION = { x: 40, y: 40 }

function normalizePosition(
  pos: { x: number; y: number } | undefined,
  index: number
): { x: number; y: number } {
  if (
    pos &&
    typeof pos.x === "number" &&
    typeof pos.y === "number" &&
    !Number.isNaN(pos.x) &&
    !Number.isNaN(pos.y) &&
    pos.x >= 0 &&
    pos.y >= 0 &&
    pos.x < 10000 &&
    pos.y < 10000
  ) {
    return pos
  }
  return getDefaultCanvasSectionPosition(index)
}

function normalizeStandaloneEntry(
  entry: StandaloneLinkEntry,
  index: number
): StandaloneLinkEntry {
  const position = normalizePosition(entry.position, index)
  return { ...entry, position }
}

function standaloneDropPositionFromDragEnd(
  event: DragEndEvent,
  placementRootRef: RefObject<HTMLDivElement | null>
): { x: number; y: number } | undefined {
  const over = event.over
  if (!over || String(over.id) !== DROP_STANDALONE_ID) return undefined
  const root = placementRootRef.current
  const translated = event.active.rect.current.translated
  if (!root || !translated) return undefined
  return standalonePositionFromTranslatedRect(translated, root)
}

export function Canvas({
  state,
  save,
  onEditSection,
  onEditLink,
  onAddLink,
  onEditStandaloneLink,
}: CanvasProps) {
  const { sections, standaloneLinks, editMode, settings } = state
  const sectionsWithPosition = sections.map((s, i) => ({
    ...s,
    position: normalizePosition(s.position, i),
  }))
  const standaloneWithPosition = standaloneLinks.map((e, i) =>
    normalizeStandaloneEntry(e, i)
  )
  const transformRef = useRef<{ x: number; y: number } | null>(null)
  const startPositionRef = useRef<{ x: number; y: number } | null>(null)
  const placementRootRef = useRef<HTMLDivElement | null>(null)
  const padRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [boardSize, setBoardSize] = useState({ width: 1, height: 1 })

  useLayoutEffect(() => {
    const board = placementRootRef.current
    if (!board) return
    const next = measureCanvasBoardSize(board)
    setBoardSize((prev) =>
      prev.width === next.width && prev.height === next.height ? prev : next
    )
  }, [sections, standaloneLinks, editMode])

  useCanvasScrollAnchor({
    scrollRef: scrollContainerRef,
    padRef,
    contentRef: placementRootRef,
    remember: settings.canvasRememberScroll,
    useSync: settings.canvasScrollSync,
    restoreOnResize: settings.canvasRestoreScrollOnResize,
  })

  const {
    onPointerDownCapture,
    onLostPointerCapture,
    spaceDown,
    isPanning,
  } = useCanvasPointerPan({
    scrollRef: scrollContainerRef,
  })

  const handleTransformChange = useCallback(
    (_id: string, transform: { x: number; y: number } | null) => {
      if (transform) transformRef.current = transform
    },
    []
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = (event: import("@dnd-kit/core").DragStartEvent) => {
    transformRef.current = null
    const activeId = String(event.active.id)
    if (parseSectionLinkDragId(activeId)) {
      startPositionRef.current = null
      return
    }
    if (activeId.startsWith(FLOATING_LINK_ID_PREFIX)) {
      const linkId = activeId.slice(FLOATING_LINK_ID_PREFIX.length)
      const entry = standaloneWithPosition.find((e) => e.link.id === linkId)
      const pos = entry?.position ?? DEFAULT_POSITION
      startPositionRef.current = { x: pos.x, y: pos.y }
      return
    }
    const section = sectionsWithPosition.find((s) => s.id === event.active.id)
    const pos = section?.position ?? DEFAULT_POSITION
    startPositionRef.current = { x: pos.x, y: pos.y }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const startPos = startPositionRef.current
    startPositionRef.current = null
    const transform = transformRef.current
    transformRef.current = null

    save((prev) => {
      if (editMode) {
        const standaloneCanvasDropPosition = standaloneDropPositionFromDragEnd(
          event,
          placementRootRef
        )
        const linkPlaced = applyLinkDragEnd(event, prev, {
          standaloneCanvasDropPosition,
        })
        if (linkPlaced) return linkPlaced
      }

      if (!startPos || !transform) return prev

      const newPosition = {
        x: Math.max(0, startPos.x + transform.x),
        y: Math.max(0, startPos.y + transform.y),
      }

      const activeId = String(event.active.id)
      if (activeId.startsWith(FLOATING_LINK_ID_PREFIX)) {
        const linkId = activeId.slice(FLOATING_LINK_ID_PREFIX.length)
        return {
          ...prev,
          standaloneLinks: prev.standaloneLinks.map((e) =>
            e.link.id === linkId ? { ...e, position: newPosition } : e
          ),
        }
      }

      const newSections = prev.sections.map((s, i) => {
        const pos = normalizePosition(s.position, i)
        const isActive = s.id === event.active.id
        return {
          ...s,
          position: isActive ? newPosition : pos,
        }
      })

      return { ...prev, sections: newSections }
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={preferSectionOverStandalone}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={scrollContainerRef}
        onPointerDownCapture={onPointerDownCapture}
        onLostPointerCapture={onLostPointerCapture}
        className={cn(
          "absolute inset-0 overflow-auto scrollbar-none",
          editMode && "canvas-grid",
          isPanning && "cursor-grabbing",
          !isPanning && spaceDown && "cursor-grab"
        )}
      >

        <div ref={padRef} className="relative box-border w-max">
          <CanvasStandaloneDropLayer />
          <div
            ref={placementRootRef}
            className="relative z-[1]"
            style={{
              width: boardSize.width,
              height: boardSize.height,
              minWidth: boardSize.width,
              minHeight: boardSize.height,
            }}
          >
            {sectionsWithPosition.map((section) => (
              <SectionFrame
                key={section.id}
                section={section}
                editMode={editMode}
                isDraggable={!DRAGGABLE_ONLY_IN_EDIT || editMode}
                sectionLabelSize={settings.sectionLabelSize}
                onEditSection={() => onEditSection(section)}
                onEditLink={(linkId) => onEditLink(section.id, linkId)}
                onAddLink={() => onAddLink(section.id)}
                onCanvasColumnSpanChange={(span) => {
                  save((prev) => ({
                    ...prev,
                    sections: prev.sections.map((s) =>
                      s.id === section.id
                        ? { ...s, canvasColumnSpan: span }
                        : s
                    ),
                  }))
                }}
                onDragEnd={() => {}}
                onTransformChange={handleTransformChange}
              />
            ))}
            {standaloneWithPosition.map((entry) => (
              <FloatingLinkCard
                key={entry.link.id}
                entry={entry}
                editMode={editMode}
                isDraggable={!DRAGGABLE_ONLY_IN_EDIT || editMode}
                onEdit={() => onEditStandaloneLink(entry.link.id)}
                onTransformChange={handleTransformChange}
              />
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  )
}
