import { useCallback, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { LinkCard } from "@/components/canvas/LinkCard"
import { ScrollArea } from "@/components/ui/scroll-area"
import { applyLinkDragEnd } from "@/lib/applyLinkDragEnd"
import type { AppState, Link } from "@/types"
import { SectionRow } from "./SectionRow"
import {
  type Section,
  type StandaloneLinkEntry,
  UNGROUPED_SECTION_ID,
} from "@/types"

const UNGROUPED_ACCENT = "#71717a"

type ListViewProps = {
  sections: Section[]
  standaloneLinks: StandaloneLinkEntry[]
  editMode: boolean
  save: (newStateOrUpdater: AppState | ((prev: AppState) => AppState)) => void
  onEditSection?: (section: Section) => void
  onEditLink?: (sectionId: string, linkId: string) => void
  onAddLink?: (sectionId: string) => void
  onEditStandaloneLink?: (linkId: string) => void
  onAddStandaloneLink?: () => void
}

export function ListView({
  sections,
  standaloneLinks,
  editMode,
  save,
  onEditSection,
  onEditLink,
  onAddLink,
  onEditStandaloneLink,
  onAddStandaloneLink,
}: ListViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const [dragOverlayLink, setDragOverlayLink] = useState<Link | null>(null)

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!editMode) return
      const link = event.active.data.current?.link as Link | undefined
      setDragOverlayLink(link ?? null)
    },
    [editMode]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragOverlayLink(null)
      if (!editMode) return
      save((prev) => applyLinkDragEnd(event, prev) ?? prev)
    },
    [editMode, save]
  )

  const handleDragCancel = useCallback(() => {
    setDragOverlayLink(null)
  }, [])

  const ungroupedSection: Section = {
    id: UNGROUPED_SECTION_ID,
    name: "Ungrouped",
    accentColor: UNGROUPED_ACCENT,
    links: standaloneLinks.map((e) => e.link),
    position: { x: 0, y: 0 },
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <DragOverlay dropAnimation={null}>
        {dragOverlayLink ? (
          <div className="cursor-grabbing opacity-95">
            <LinkCard link={dragOverlayLink} editMode={false} />
          </div>
        ) : null}
      </DragOverlay>
      <ScrollArea className="h-svh">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {(standaloneLinks.length > 0 || editMode) && (
            <SectionRow
              key={UNGROUPED_SECTION_ID}
              section={ungroupedSection}
              editMode={editMode}
              onEditLink={
                onEditStandaloneLink
                  ? (linkId) => onEditStandaloneLink(linkId)
                  : undefined
              }
              onAddLink={onAddStandaloneLink}
            />
          )}
          {sections.map((section) => (
            <SectionRow
              key={section.id}
              section={section}
              editMode={editMode}
              onEditSection={
                onEditSection ? () => onEditSection?.(section) : undefined
              }
              onEditLink={
                onEditLink
                  ? (linkId) => onEditLink(section.id, linkId)
                  : undefined
              }
              onAddLink={onAddLink ? () => onAddLink(section.id) : undefined}
            />
          ))}
        </div>
      </ScrollArea>
    </DndContext>
  )
}
