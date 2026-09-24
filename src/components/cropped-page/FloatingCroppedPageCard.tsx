import { useCallback, useEffect, useRef, useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { croppedPageDragId } from "@/components/dnd/linkDragIds"
import type { CroppedPage, SectionLabelSize } from "@/types"
import { CroppedPageHeader } from "./CroppedPageHeader"
import { registerCroppedPageSlot } from "./croppedPageSlots"
import { cn } from "@/lib/utils"

type FloatingCroppedPageCardProps = {
  page: CroppedPage
  editMode: boolean
  isDraggable: boolean
  sectionLabelSize?: SectionLabelSize
  onEdit: (originRect: DOMRect) => void
  onExpand: (originRect: DOMRect) => void
  onTransformChange?: (
    pageId: string,
    transform: { x: number; y: number } | null
  ) => void
}

export function FloatingCroppedPageCard({
  page,
  editMode,
  isDraggable,
  sectionLabelSize = "text-lg",
  onEdit,
  onExpand,
  onTransformChange,
}: FloatingCroppedPageCardProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isCardHovered, setIsCardHovered] = useState(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: croppedPageDragId(page.id),
      data: { kind: "croppedPage" as const, pageId: page.id },
      disabled: !isDraggable,
    })

  useEffect(() => {
    onTransformChange?.(page.id, transform ?? null)
  }, [page.id, transform, onTransformChange])

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node
      setNodeRef(node)
    },
    [setNodeRef]
  )

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setRefs}
      style={{
        position: "absolute",
        left: page.position.x,
        top: page.position.y,
        width: page.crop.width,
        outlineColor: page.accentColor,
        outlineOffset: "-1px",
        ...style,
      }}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      className={cn(
        "group relative z-1 flex min-w-0 shrink-0 flex-col gap-0 p-0 shadow-sm",
        editMode && "outline-outline outline",
        isDraggable && !isDragging && "hover:bg-white/5 hover:backdrop-blur-sm",
        isDragging && "z-50 bg-white/10 shadow-lg backdrop-blur-sm"
      )}
    >
      {isDraggable ? (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute -top-[3px] left-1/2 z-10 flex -translate-x-1/2 cursor-grab flex-col items-center gap-0.5 transition-opacity",
            "backdrop-blur-sm before:absolute before:top-1/2 before:left-1/2 before:z-1 before:h-4 before:w-7 before:-translate-x-1/2 before:-translate-y-1/2 before:bg-background/80 before:content-['']",
            isDragging && "cursor-grabbing",
            !editMode && !isCardHovered && "opacity-0",
            !editMode && isCardHovered && "opacity-100"
          )}
          aria-label="Drag cutout"
        >
          {[1, 2].map((i) => (
            <span
              key={i}
              className="z-4 h-[2px] w-5 rounded-full"
              style={{ backgroundColor: page.accentColor }}
            />
          ))}
        </div>
      ) : null}
      <CroppedPageHeader
        url={page.url}
        label={page.label}
        accentColor={page.accentColor}
        labelSize={sectionLabelSize}
        editMode={editMode}
        labelIsLink={!editMode}
        revealActionsOnHover
        onEdit={() => {
          const origin = rootRef.current?.getBoundingClientRect()
          if (origin) onEdit(origin)
        }}
        onExpand={() => {
          const origin = rootRef.current?.getBoundingClientRect()
          if (origin) onExpand(origin)
        }}
      />
      <div
        ref={(node) => registerCroppedPageSlot(page.id, "canvas", node)}
        className="relative bg-background/60 backdrop-blur-sm"
        style={{
          width: page.crop.width,
          height: page.crop.height,
          outline: `1px solid ${page.accentColor}`,
        }}
      />
    </div>
  )
}
