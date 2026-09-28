import { useCallback, useEffect, useRef, useState } from "react"
import { useDndMonitor, useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { floatingLinkDragId } from "@/components/dnd/linkDragIds"
import { LinkCard } from "./LinkCard"
import { cn } from "@/lib/utils"
import type { StandaloneLinkEntry } from "@/types"

type FloatingLinkCardProps = {
  entry: StandaloneLinkEntry
  editMode: boolean
  isDraggable: boolean
  onEdit: () => void
  /** Faded and non-interactive while a section label is being edited. */
  muted?: boolean
  onTransformChange?: (
    linkId: string,
    transform: { x: number; y: number } | null
  ) => void
}

export function FloatingLinkCard({
  entry,
  editMode,
  isDraggable,
  onEdit,
  muted = false,
  onTransformChange,
}: FloatingLinkCardProps) {
  const { link, position } = entry
  const containerRef = useRef<HTMLDivElement | null>(null)
  const blockClickRef = useRef<((e: Event) => void) | null>(null)
  const cleanupTimerRef = useRef<number | null>(null)

  const removeBlockClickListener = useCallback(() => {
    if (cleanupTimerRef.current !== null) {
      window.clearTimeout(cleanupTimerRef.current)
      cleanupTimerRef.current = null
    }
    if (blockClickRef.current) {
      document.removeEventListener("click", blockClickRef.current, {
        capture: true,
      })
      blockClickRef.current = null
    }
  }, [])

  useDndMonitor({
    onDragStart(event) {
      if (event.active.id !== floatingLinkDragId(link.id)) return
      removeBlockClickListener()
      const container = containerRef.current
      if (!container) return
      const blockClickFromDrag = (e: Event) => {
        if (!container.contains(e.target as Node)) return
        e.preventDefault()
        e.stopPropagation()
      }
      blockClickRef.current = blockClickFromDrag
      document.addEventListener("click", blockClickFromDrag, { capture: true })
    },
    onDragEnd(event) {
      if (event.active.id !== floatingLinkDragId(link.id)) return
      if (cleanupTimerRef.current !== null) {
        window.clearTimeout(cleanupTimerRef.current)
      }
      cleanupTimerRef.current = window.setTimeout(() => {
        cleanupTimerRef.current = null
        removeBlockClickListener()
      }, 500)
    },
    onDragCancel(event) {
      if (event.active.id !== floatingLinkDragId(link.id)) return
      removeBlockClickListener()
    },
  })

  useEffect(() => {
    return () => removeBlockClickListener()
  }, [removeBlockClickListener])

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: floatingLinkDragId(link.id),
      data: { kind: "standalone" as const, linkId: link.id },
      disabled: !isDraggable,
    })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  const [isCardHovered, setIsCardHovered] = useState(false)

  useEffect(() => {
    onTransformChange?.(link.id, transform ?? null)
  }, [link.id, transform, onTransformChange])

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node)
      containerRef.current = node
    },
    [setNodeRef]
  )

  return (
    <div
      ref={setContainerRef}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        ...style,
      }}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
      inert={muted ? true : undefined}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      className={cn(
        "group relative flex w-fit flex-col items-center rounded-none p-0",
        muted && "pointer-events-none opacity-20",
        isDraggable && "backdrop-blur-sm",
        isDraggable && (isDragging ? "cursor-grabbing" : "cursor-grab"),
        isDraggable && !isDragging && "hover:bg-white/5 hover:backdrop-blur-sm",
        isDragging && "z-50 bg-white/10 shadow-lg backdrop-blur-sm"
      )}
    >
      {isDraggable && !editMode && (
        <div
          className={cn(
            "pointer-events-none absolute -top-0.5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-0.5 transition-opacity",
            !isCardHovered && "opacity-0",
            isCardHovered && "opacity-100"
          )}
          aria-hidden
        >
          {[1, 2].map((i) => (
            <span
              key={i}
              className="h-[2px] w-5 rounded-full bg-muted-foreground/50"
            />
          ))}
        </div>
      )}
      <LinkCard
        link={link}
        editMode={editMode}
        isDragging={isDraggable && isDragging}
        onEdit={onEdit}
      />
    </div>
  )
}
