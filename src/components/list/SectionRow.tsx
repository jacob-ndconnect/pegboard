import { PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react"
import { useDroppable } from "@dnd-kit/core"
import { LinkCard } from "@/components/canvas/LinkCard"
import { LinkDropTargetOverlay } from "@/components/dnd/LinkDropTargetOverlay"
import { dropSectionDroppableId } from "@/components/dnd/linkDragIds"
import { isActiveLinkDrag } from "@/components/dnd/isActiveLinkDrag"
import { SectionLinkDraggable } from "@/components/dnd/SectionLinkDraggable"
import { StandaloneListLinkDraggable } from "@/components/dnd/StandaloneListLinkDraggable"
import type { Section } from "@/types"
import { UNGROUPED_SECTION_ID } from "@/types"

type SectionRowProps = {
  section: Section
  editMode: boolean
  onEditSection?: () => void
  onEditLink?: (linkId: string) => void
  onAddLink?: () => void
}

export function SectionRow({
  section,
  editMode,
  onEditSection,
  onEditLink,
  onAddLink,
}: SectionRowProps) {
  const {
    setNodeRef: setLinksDropRef,
    isOver: isDropOverLinks,
    active: dropContextActive,
  } = useDroppable({
    id: dropSectionDroppableId(section.id),
    data: { kind: "section-drop" as const, sectionId: section.id },
  })

  const linkDropTargetActive =
    isDropOverLinks && isActiveLinkDrag(dropContextActive)

  const isUngrouped = section.id === UNGROUPED_SECTION_ID

  return (
    <section className="border-b border-border/60 py-6 last:border-b-0">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: section.accentColor }}
          aria-hidden
        />
        <h2
          className="text-sm font-semibold"
          style={{ color: section.accentColor }}
        >
          {section.name}
        </h2>
        {editMode && onEditSection && (
          <button
            type="button"
            onClick={onEditSection}
            className="ml-1 cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Edit section"
          >
            <PencilSimpleIcon className="size-4" />
          </button>
        )}
      </div>
      <div
        ref={setLinksDropRef}
        className="relative flex gap-0 overflow-x-auto rounded-none pt-4 pr-4 pb-2"
      >
        <LinkDropTargetOverlay
          visible={linkDropTargetActive}
          message={isUngrouped ? "Move to Ungrouped" : "Move to this section"}
        />
        {section.links.map((link) =>
          isUngrouped ? (
            <StandaloneListLinkDraggable
              key={link.id}
              linkId={link.id}
              link={link}
              editMode={editMode}
            >
              <LinkCard
                link={link}
                editMode={editMode}
                onEdit={onEditLink ? () => onEditLink(link.id) : undefined}
                accentColor={section.accentColor}
              />
            </StandaloneListLinkDraggable>
          ) : (
            <SectionLinkDraggable
              key={link.id}
              sectionId={section.id}
              linkId={link.id}
              link={link}
              editMode={editMode}
              layout="list"
            >
              <LinkCard
                link={link}
                editMode={editMode}
                onEdit={onEditLink ? () => onEditLink(link.id) : undefined}
                accentColor={section.accentColor}
              />
            </SectionLinkDraggable>
          )
        )}
        {editMode && onAddLink && (
          <button
            type="button"
            onClick={onAddLink}
            className="my-auto flex size-[100px] shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
          >
            <PlusIcon className="size-6" />
            <span className="text-xs">Add Link</span>
          </button>
        )}
      </div>
    </section>
  )
}
