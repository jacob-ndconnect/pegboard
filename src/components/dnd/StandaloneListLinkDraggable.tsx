import type { ReactNode } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import type { Link } from "@/types"
import { floatingLinkDragId } from "./linkDragIds"

type StandaloneListLinkDraggableProps = {
  linkId: string
  link: Link
  editMode: boolean
  children: ReactNode
}

/** List view: ungrouped links use the same drag ids as canvas floating links. */
export function StandaloneListLinkDraggable({
  linkId,
  link,
  editMode,
  children,
}: StandaloneListLinkDraggableProps) {
  const enabled = editMode
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: floatingLinkDragId(linkId),
      data: { kind: "standalone" as const, linkId, link },
      disabled: !enabled,
    })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(enabled ? listeners : {})}
      {...(enabled ? attributes : {})}
      className={cn(
        "relative shrink-0 pt-0 pr-0",
        enabled && "cursor-grab touch-none active:cursor-grabbing",
        enabled && isDragging && "opacity-40"
      )}
    >
      {/* {enabled && (
        <div
          className="pointer-events-none absolute -top-0.5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-0.5"
          aria-hidden
        >
          {[1, 2].map((i) => (
            <span
              key={i}
              className="h-[2px] w-5 rounded-full bg-muted-foreground/60"
            />
          ))}
        </div>
      )} */}
      {children}
    </div>
  )
}
