import { useCallback, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import {
  ArrowLeftIcon,
  PencilSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react"
import { LinkCard } from "@/components/canvas/LinkCard"
import { DotBackground } from "@/components/canvas/DotGridBackground"
import { applyLinkDragEnd } from "@/lib/applyLinkDragEnd"
import {
  collectFolderOpenFlipCapture,
  prefersFolderFlipReducedMotion,
  runFolderLinkEntranceFromTile,
} from "@/lib/folderLinkFlip"
import { getFaviconUrl } from "@/lib/favicon"
import { cn } from "@/lib/utils"
import { LinkDropTargetOverlay } from "@/components/dnd/LinkDropTargetOverlay"
import { dropSectionDroppableId } from "@/components/dnd/linkDragIds"
import { isActiveLinkDrag } from "@/components/dnd/isActiveLinkDrag"
import { SectionLinkDraggable } from "@/components/dnd/SectionLinkDraggable"
import { StandaloneListLinkDraggable } from "@/components/dnd/StandaloneListLinkDraggable"
import type { AppState, Link, Section } from "@/types"
import { UNGROUPED_SECTION_ID } from "@/types"

const UNGROUPED_ACCENT = "#71717a"

type FolderViewProps = {
  sections: Section[]
  standaloneLinks: AppState["standaloneLinks"]
  editMode: boolean
  save: (newStateOrUpdater: AppState | ((prev: AppState) => AppState)) => void
  onEditSection?: (section: Section) => void
  onEditLink?: (sectionId: string, linkId: string) => void
  onAddLink?: (sectionId: string) => void
  onEditStandaloneLink?: (linkId: string) => void
  onAddStandaloneLink?: () => void
}

function linkLetter(label: string): string {
  return label.charAt(0).toUpperCase() || "?"
}

function linkMicroHue(label: string): string {
  const hue = label.charCodeAt(0) % 360
  return `hsl(${hue}, 65%, 55%)`
}

function LinkMicroThumb({ link }: { link: Link }) {
  const [failed, setFailed] = useState(false)
  const src = getFaviconUrl(link.url)
  const letter = linkLetter(link.label)
  return (
    <div
      className="flex size-8 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
      style={
        failed || !src
          ? { backgroundColor: linkMicroHue(link.label) }
          : undefined
      }
    >
      {failed || !src ? (
        letter
      ) : (
        <img
          src={src}
          alt=""
          className={cn(
            "size-full object-cover",
            link.invertIcon && "dark:invert"
          )}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

function FolderTile({
  section,
  editMode,
  onOpen,
}: {
  section: Section
  editMode: boolean
  onOpen: () => void
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: dropSectionDroppableId(section.id),
    data: { kind: "section-drop" as const, sectionId: section.id },
  })
  const dropActive = isOver && isActiveLinkDrag(active)
  const isUngrouped = section.id === UNGROUPED_SECTION_ID
  const previews = section.links.slice(0, 9)

  return (
    <button
      type="button"
      ref={setNodeRef}
      data-folder-tile-id={section.id}
      onClick={onOpen}
      className={cn(
        "relative flex min-h-[132px] cursor-pointer flex-col rounded-none border-2 border-border/80 bg-card/90 p-4 text-left shadow-sm transition-[transform,box-shadow] hover:border-border hover:shadow-md",
        editMode && "cursor-pointer"
      )}
      aria-label={`Open folder ${section.name}`}
    >
      <LinkDropTargetOverlay
        visible={dropActive}
        message={isUngrouped ? "Move to Ungrouped" : "Move to this folder"}
      />
      <div className="mb-3 flex items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: section.accentColor }}
          aria-hidden
        />
        <span
          className="truncate text-sm font-semibold"
          style={{ color: section.accentColor }}
        >
          {section.name}
        </span>
      </div>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-row flex-wrap content-start items-start gap-1.5">
        {previews.map((link) => (
          <span
            key={link.id}
            data-folder-flip-source={link.id}
            className="inline-block shrink-0"
          >
            <LinkMicroThumb link={link} />
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {section.links.length === 1
          ? "1 link"
          : `${section.links.length} links`}
      </p>
    </button>
  )
}

function MoveToFolderChip({
  targetId,
  label,
  accentColor,
}: {
  targetId: string
  label: string
  accentColor: string
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: dropSectionDroppableId(targetId),
    data: { kind: "section-drop" as const, sectionId: targetId },
  })
  const dropActive = isOver && isActiveLinkDrag(active)

  return (
    <div
      ref={setNodeRef}
      className="relative min-h-11 min-w-72 shrink-0 rounded-full border border-border bg-muted/40 px-4 py-2.5"
    >
      <LinkDropTargetOverlay
        visible={dropActive}
        message={`Move to ${label}`}
      />
      <span
        className="flex max-w-56 min-w-0 items-center gap-2 truncate text-sm font-medium"
        style={{ color: accentColor }}
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
        {label}
      </span>
    </div>
  )
}

export function FolderView({
  sections,
  standaloneLinks,
  editMode,
  save,
  onEditSection,
  onEditLink,
  onAddLink,
  onEditStandaloneLink,
  onAddStandaloneLink,
}: FolderViewProps) {
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const [dragOverlayLink, setDragOverlayLink] = useState<Link | null>(null)
  const folderSurfaceRef = useRef<HTMLDivElement>(null)
  const folderDetailRef = useRef<HTMLDivElement>(null)
  const isDndDraggingRef = useRef(false)

  const reduceMotion = prefersFolderFlipReducedMotion()

  const openFolder = useCallback((id: string) => {
    const { thumbRects, tileRect } = collectFolderOpenFlipCapture(id)
    flushSync(() => setOpenSectionId(id))
    runFolderLinkEntranceFromTile(thumbRects, id, tileRect)
  }, [])

  const closeFolder = useCallback(() => {
    setOpenSectionId(null)
  }, [])

  useEffect(() => {
    if (openSectionId === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.stopImmediatePropagation()
      closeFolder()
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [openSectionId, closeFolder])

  useEffect(() => {
    if (openSectionId === null) return
    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (isDndDraggingRef.current) return
      const t = e.target
      if (!(t instanceof Node)) return
      if (!folderSurfaceRef.current?.contains(t)) return
      const detail = folderDetailRef.current
      if (!detail) return
      if (detail.contains(t)) return
      closeFolder()
    }
    document.addEventListener("pointerdown", onPointerDownCapture, true)
    return () =>
      document.removeEventListener("pointerdown", onPointerDownCapture, true)
  }, [openSectionId, closeFolder])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!editMode) return
      const link = event.active.data.current?.link as Link | undefined
      setDragOverlayLink(link ?? null)
      if (link) isDndDraggingRef.current = true
    },
    [editMode]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      isDndDraggingRef.current = false
      setDragOverlayLink(null)
      if (!editMode) return
      save((prev) => applyLinkDragEnd(event, prev) ?? prev)
    },
    [editMode, save]
  )

  const handleDragCancel = useCallback(() => {
    isDndDraggingRef.current = false
    setDragOverlayLink(null)
  }, [])

  const ungroupedSection: Section = {
    id: UNGROUPED_SECTION_ID,
    name: "Ungrouped",
    accentColor: UNGROUPED_ACCENT,
    links: standaloneLinks.map((e) => e.link),
    position: { x: 0, y: 0 },
  }

  const openSection: Section | null =
    openSectionId === null
      ? null
      : openSectionId === UNGROUPED_SECTION_ID
        ? ungroupedSection
        : (sections.find((s) => s.id === openSectionId) ?? null)

  const moveTargets: { id: string; label: string; accent: string }[] = [
    ...(standaloneLinks.length > 0 || editMode
      ? [
          {
            id: UNGROUPED_SECTION_ID,
            label: "Ungrouped",
            accent: UNGROUPED_ACCENT,
          },
        ]
      : []),
    ...sections.map((s) => ({
      id: s.id,
      label: s.name,
      accent: s.accentColor,
    })),
  ].filter((t) => t.id !== openSectionId)

  const showUngroupedTile = standaloneLinks.length > 0 || editMode

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div ref={folderSurfaceRef} className="absolute inset-0">
        <DragOverlay dropAnimation={null}>
          {dragOverlayLink ? (
            <div className="cursor-grabbing opacity-95">
              <LinkCard link={dragOverlayLink} editMode={false} />
            </div>
          ) : null}
        </DragOverlay>
        <DotBackground className="bg-background" />
        <div className="absolute inset-0 z-10 overflow-y-auto">
          {openSection ? (
            <div className="pointer-events-none mx-auto w-full max-w-4xl px-6 pt-20 pb-28">
              <div
                ref={folderDetailRef}
                className={cn(
                  "pointer-events-auto w-full",
                  (reduceMotion || openSection.links.length === 0) &&
                    "folder-view-panel-enter"
                )}
              >
                <header className="mb-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeFolder}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
                  >
                    <ArrowLeftIcon className="size-4" aria-hidden />
                    Folders
                  </button>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: openSection.accentColor }}
                      aria-hidden
                    />
                    <h1
                      className="truncate text-lg font-semibold"
                      style={{ color: openSection.accentColor }}
                    >
                      {openSection.name}
                    </h1>
                    {editMode &&
                      openSection.id !== UNGROUPED_SECTION_ID &&
                      onEditSection && (
                        <button
                          type="button"
                          onClick={() => onEditSection(openSection)}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Edit folder"
                        >
                          <PencilSimpleIcon className="size-4 cursor-pointer" />
                        </button>
                      )}
                  </div>
                </header>

                <FolderDetailLinks
                  section={openSection}
                  editMode={editMode}
                  onEditLink={onEditLink}
                  onAddLink={onAddLink}
                  onEditStandaloneLink={onEditStandaloneLink}
                  onAddStandaloneLink={onAddStandaloneLink}
                />

                {editMode &&
                  dragOverlayLink != null &&
                  moveTargets.length > 0 && (
                    <div className="mt-6">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Move to
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {moveTargets.map((t) => (
                          <MoveToFolderChip
                            key={t.id}
                            targetId={t.id}
                            label={t.label}
                            accentColor={t.accent}
                          />
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "pointer-events-none mx-auto max-w-5xl px-6 pt-20 pb-28",
                !reduceMotion && "folder-view-grid-enter"
              )}
            >
              <div className="pointer-events-auto">
                <h1 className="mb-8 text-center text-lg font-semibold text-foreground">
                  Folders
                </h1>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {showUngroupedTile && (
                    <FolderTile
                      section={ungroupedSection}
                      editMode={editMode}
                      onOpen={() => openFolder(UNGROUPED_SECTION_ID)}
                    />
                  )}
                  {sections.map((section) => (
                    <FolderTile
                      key={section.id}
                      section={section}
                      editMode={editMode}
                      onOpen={() => openFolder(section.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DndContext>
  )
}

function FolderDetailLinks({
  section,
  editMode,
  onEditLink,
  onAddLink,
  onEditStandaloneLink,
  onAddStandaloneLink,
}: {
  section: Section
  editMode: boolean
  onEditLink?: (sectionId: string, linkId: string) => void
  onAddLink?: (sectionId: string) => void
  onEditStandaloneLink?: (linkId: string) => void
  onAddStandaloneLink?: () => void
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: dropSectionDroppableId(section.id),
    data: { kind: "section-drop" as const, sectionId: section.id },
  })
  const dropActive = isOver && isActiveLinkDrag(active)
  const isUngrouped = section.id === UNGROUPED_SECTION_ID

  return (
    <div
      ref={setNodeRef}
      data-folder-panel={section.id}
      className="relative min-h-48 rounded-2xl"
    >
      <div
        data-folder-flip-backdrop
        className="pointer-events-none absolute inset-0 z-0 rounded-none border border-border/60 bg-card/30"
        aria-hidden
      />
      <LinkDropTargetOverlay
        visible={dropActive}
        message={isUngrouped ? "Move to Ungrouped" : "Move to this folder"}
      />
      <div className="relative z-1 flex min-h-48 w-full flex-wrap gap-4 p-6">
        {section.links.length === 0 && !editMode && (
          <p className="text-sm text-muted-foreground">
            No links in this folder.
          </p>
        )}
        {section.links.map((link) =>
          isUngrouped ? (
            <StandaloneListLinkDraggable
              key={link.id}
              linkId={link.id}
              link={link}
              editMode={editMode}
            >
              <div data-folder-flip-target={link.id} className="inline-block">
                <LinkCard
                  link={link}
                  editMode={editMode}
                  onEdit={
                    onEditStandaloneLink
                      ? () => onEditStandaloneLink(link.id)
                      : undefined
                  }
                />
              </div>
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
              <div data-folder-flip-target={link.id} className="inline-block">
                <LinkCard
                  link={link}
                  editMode={editMode}
                  onEdit={
                    onEditLink
                      ? () => onEditLink(section.id, link.id)
                      : undefined
                  }
                />
              </div>
            </SectionLinkDraggable>
          )
        )}
        {editMode && (isUngrouped ? onAddStandaloneLink : onAddLink) && (
          <button
            type="button"
            onClick={() =>
              isUngrouped ? onAddStandaloneLink?.() : onAddLink?.(section.id)
            }
            className="my-auto flex size-[100px] shrink-0 flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
          >
            <PlusIcon className="size-6" />
            <span className="text-xs">Add link</span>
          </button>
        )}
      </div>
    </div>
  )
}
