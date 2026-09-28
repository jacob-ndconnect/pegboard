import { useCallback, useEffect, useRef, useState } from "react"
import { PlusIcon } from "@phosphor-icons/react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { LinkDropTargetOverlay } from "@/components/dnd/LinkDropTargetOverlay"
import { dropSectionDroppableId } from "@/components/dnd/linkDragIds"
import { isActiveLinkDrag } from "@/components/dnd/isActiveLinkDrag"
import { SectionLinkDraggable } from "@/components/dnd/SectionLinkDraggable"
import { LinkCard } from "./LinkCard"
import { ColorPickerPopover } from "@/components/ui/color-picker"
import { editingLabelStyle, getContrastColor } from "@/lib/color"
import { COLOR_SWATCHES } from "@/lib/color-swatches"
import { useReadableAccent } from "@/hooks/useReadableAccent"
import {
  canvasColumnSpanFromTargetWidth,
  effectiveCanvasColumnSpan,
  maxCanvasColumnSpanForSection,
  readHorizontalBorderPx,
  readHorizontalPaddingPx,
  SECTION_FRAME_OUTER_PADDING_X,
  SECTION_LINKS_INNER_PADDING_X,
  SECTION_LINKS_BORDER_X,
  sectionFrameOuterWidthPx,
} from "@/lib/canvasGrid"
import { sectionResizeDebugLog } from "@/lib/extensionDebugLog"
import { cn } from "@/lib/utils"
import type { Section, SectionLabelSize } from "@/types"
import {
  FloppyDiskIcon,
  PaletteIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react/dist/ssr"

type SectionFrameProps = {
  section: Section
  editMode: boolean
  isDraggable: boolean
  sectionLabelSize?: SectionLabelSize
  onEditSection: () => void
  /** Canvas inline rename. Other canvas items are dimmed by the parent. */
  labelEditing?: boolean
  onRename?: (name: string) => void
  onAccentColorChange?: (accentColor: string) => void
  onExitLabelEditing?: () => void
  /** Faded and non-interactive while another section is being renamed. */
  muted?: boolean
  onEditLink: (linkId: string) => void
  onAddLink?: () => void
  /** Snap-to-grid horizontal resize (canvas column count), edit mode only. */
  onCanvasColumnSpanChange?: (columnSpan: number) => void
  onDragEnd: (id: string, newPosition: { x: number; y: number }) => void
  onTransformChange?: (
    id: string,
    transform: { x: number; y: number } | null
  ) => void
}

const DEFAULT_POSITION = { x: 40, y: 40 }

export function SectionFrame({
  section,
  editMode,
  isDraggable,
  sectionLabelSize = "text-lg",
  onEditSection,
  labelEditing = false,
  onRename,
  onAccentColorChange,
  onExitLabelEditing,
  muted = false,
  onEditLink,
  onAddLink,
  onCanvasColumnSpanChange,
  onTransformChange,
}: SectionFrameProps) {
  const position = section.position ?? DEFAULT_POSITION

  const [resizePreviewSpan, setResizePreviewSpan] = useState<number | null>(
    null
  )
  const resizeDragRef = useRef<{
    pointerId: number
    startClientX: number
    /** Link-row inner width (outer RR width − outer pad − links pad) at pointerdown. */
    startTileInner: number
    linkCap: number
  } | null>(null)
  const lastResizeSpanRef = useRef<number | null>(null)
  const lastResizeLoggedSpanRef = useRef<number | null>(null)
  const frameOuterElRef = useRef<HTMLDivElement | null>(null)

  const columnSpan = resizePreviewSpan ?? effectiveCanvasColumnSpan(section)
  const frameWidthPx = sectionFrameOuterWidthPx(columnSpan)

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: section.id,
      data: { kind: "section" as const, section },
      disabled: !isDraggable,
    })

  const setFrameOuterRef = useCallback(
    (el: HTMLDivElement | null) => {
      frameOuterElRef.current = el
      setNodeRef(el)
    },
    [setNodeRef]
  )

  const {
    setNodeRef: setLinksDropRef,
    isOver: isDropOverLinks,
    active: dropContextActive,
  } = useDroppable({
    id: dropSectionDroppableId(section.id),
    data: { kind: "section-drop" as const, sectionId: section.id },
  })

  const linksPanelElRef = useRef<HTMLDivElement | null>(null)
  const setLinksPanelRef = useCallback(
    (el: HTMLDivElement | null) => {
      linksPanelElRef.current = el
      setLinksDropRef(el)
    },
    [setLinksDropRef]
  )

  const linkDropTargetActive =
    isDropOverLinks && isActiveLinkDrag(dropContextActive)

  const sectionEditMode = editMode || labelEditing
  const readableAccent = useReadableAccent(section.accentColor)
  const sectionAccentActionStyle = {
    "--section-accent": section.accentColor,
    "--section-accent-contrast": getContrastColor(section.accentColor),
    "--section-accent-readable": readableAccent,
  } as React.CSSProperties

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  const [isCardHovered, setIsCardHovered] = useState(false)
  const [editingName, setEditingName] = useState(section.name)
  const editingNameRef = useRef(section.name)
  const sectionNameRef = useRef(section.name)
  const onRenameRef = useRef(onRename)
  const nameInputRef = useRef<HTMLInputElement>(null)
  sectionNameRef.current = section.name
  onRenameRef.current = onRename
  editingNameRef.current = editingName

  useEffect(() => {
    if (!labelEditing) return
    setEditingName(sectionNameRef.current)
    editingNameRef.current = sectionNameRef.current
    const frame = requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [labelEditing])

  useEffect(() => {
    if (!labelEditing) return
    const timeout = window.setTimeout(() => {
      const trimmed = editingNameRef.current.trim()
      if (!trimmed || trimmed === sectionNameRef.current) return
      onRenameRef.current?.(trimmed)
    }, 200)
    return () => window.clearTimeout(timeout)
  }, [editingName, labelEditing])

  useEffect(() => {
    if (!labelEditing) return
    return () => {
      const trimmed = editingNameRef.current.trim()
      if (!trimmed || trimmed === sectionNameRef.current) return
      onRenameRef.current?.(trimmed)
    }
  }, [labelEditing])

  useEffect(() => {
    onTransformChange?.(section.id, transform ?? null)
  }, [section.id, transform, onTransformChange])

  const endResizeGesture = (
    target: HTMLElement,
    pointerId: number,
    commit: boolean
  ) => {
    const session = resizeDragRef.current
    if (!session || session.pointerId !== pointerId) return
    resizeDragRef.current = null
    try {
      target.releasePointerCapture(pointerId)
    } catch {
      // already released
    }
    const finalSpan = lastResizeSpanRef.current
    lastResizeSpanRef.current = null
    setResizePreviewSpan(null)
    if (
      commit &&
      finalSpan !== null &&
      finalSpan !== effectiveCanvasColumnSpan(section)
    ) {
      onCanvasColumnSpanChange?.(finalSpan)
    }
  }

  return (
    <div
      ref={setFrameOuterRef}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: frameWidthPx,
        maxWidth: frameWidthPx,
        minWidth: 0,
        outlineColor: section.accentColor,
        outlineOffset: "-1px",
        ...style,
      }}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      inert={muted ? true : undefined}
      className={cn(
        "group relative z-1 flex min-w-0 shrink-0 flex-col gap-0 p-0 shadow-sm",
        labelEditing && "z-20",
        muted && "pointer-events-none opacity-20",
        sectionEditMode && "outline-outline outline",
        isDraggable && !isDragging && "hover:bg-white/5 hover:backdrop-blur-sm",
        isDraggable && isDragging && "cursor-grabbing",
        isDragging && "z-50 bg-white/10 shadow-lg backdrop-blur-sm"
      )}
    >
      {isDraggable && (
        <div
          {...(isDraggable ? { ...attributes, ...listeners } : {})}
          className={cn(
            "absolute -top-[3px] left-1/2 z-5 z-10 flex -translate-x-1/2 cursor-grab flex-col items-center gap-0.5 transition-opacity",
            "backdrop-blur-sm before:absolute before:top-1/2 before:left-1/2 before:z-1 before:h-4 before:w-7 before:-translate-x-1/2 before:-translate-y-1/2 before:bg-background/80 before:content-['']",
            isDragging && "cursor-grabbing",
            !sectionEditMode && !isCardHovered && "opacity-0",
            !sectionEditMode && isCardHovered && "opacity-100"
          )}
          aria-label="Drag section"
        >
          {[1, 2].map((i) => (
            <span
              key={i}
              className="z-4 h-[2px] w-5 rounded-full"
              style={{ backgroundColor: section.accentColor }}
            />
          ))}
        </div>
      )}
      <div
        className={cn(
          "group flex min-w-0 items-center justify-between pb-0",
          !labelEditing && "gap-2"
        )}
      >
        {labelEditing ? (
          <div className="flex min-w-0 items-center">
            <label
              className={cn(
                "flex max-w-full min-w-0 items-center px-2 py-1 font-geist-pixel",
                sectionLabelSize
              )}
              style={{
                ...editingLabelStyle(section.accentColor),
                fontVariationSettings:
                  "var(--geist-pixel-variation-settings, normal)",
                fontFeatureSettings:
                  "var(--geist-pixel-feature-settings, normal)",
              }}
            >
              <input
                ref={nameInputRef}
                value={editingName}
                aria-label="Section name"
                placeholder="Section name"
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return
                  e.preventDefault()
                  onExitLabelEditing?.()
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="field-sizing-content min-w-[4ch] max-w-[70vw] bg-transparent text-white outline-none placeholder:text-white/60"
              />
            </label>
            <ColorPickerPopover
              value={section.accentColor}
              onValueChange={(_, parsed) => onAccentColorChange?.(parsed.hex)}
              swatches={[...COLOR_SWATCHES]}
              hideEyedropper
              panelZIndex={260}
              triggerClassName="size-8 justify-center border-0 bg-transparent p-0 hover:bg-white/10"
              trigger={
                <PaletteIcon
                  className="size-5"
                  style={{ color: readableAccent }}
                />
              }
            />
          </div>
        ) : (
          <h3
            className={cn(
              "max-w-full min-w-0 truncate px-2 py-1 font-geist-pixel",
              sectionLabelSize
            )}
            style={{
              backgroundColor: section.accentColor,
              color: getContrastColor(section.accentColor),
              fontVariationSettings:
                "var(--geist-pixel-variation-settings, normal)",
              fontFeatureSettings:
                "var(--geist-pixel-feature-settings, normal)",
            }}
          >
            {section.name}
          </h3>
        )}
        <div
          className={cn(
            "flex shrink-0 items-center",
            !labelEditing && "gap-0.5"
          )}
        >
          {onAddLink && !labelEditing && (
            <button
              type="button"
              style={sectionAccentActionStyle}
              onClick={(e) => {
                e.stopPropagation()
                onAddLink()
              }}
              className={cn(
                "group/icon-action cursor-pointer rounded-none p-1.5 transition-colors hover:bg-[var(--section-accent)]",
                !sectionEditMode &&
                  "opacity-0 transition-opacity group-hover:opacity-100"
              )}
              aria-label="Add link"
            >
              <PlusIcon
                className="size-5 text-[var(--section-accent-readable)] transition-colors group-hover/icon-action:text-[var(--section-accent-contrast)]"
                aria-hidden
              />
            </button>
          )}
          <button
            type="button"
            style={sectionAccentActionStyle}
            onClick={(e) => {
              e.stopPropagation()
              if (labelEditing) onExitLabelEditing?.()
              else onEditSection()
            }}
            className={cn(
              "group/icon-action flex cursor-pointer items-center rounded-none p-1.5 transition-colors",
              labelEditing
                ? "gap-1.5 bg-[var(--section-accent)] text-[var(--section-accent-contrast)] hover:brightness-110"
                : "hover:bg-[var(--section-accent)]",
              !sectionEditMode &&
                "opacity-0 transition-opacity group-hover:opacity-100"
            )}
            aria-label={labelEditing ? "Save section" : "Edit section"}
          >
            {labelEditing ? (
              <>
                <FloppyDiskIcon className="size-5" aria-hidden />
                <span className="text-sm">Save</span>
              </>
            ) : (
              <PencilSimpleIcon
                className="size-5 text-[var(--section-accent-readable)] transition-colors group-hover/icon-action:text-[var(--section-accent-contrast)]"
                aria-hidden
              />
            )}
          </button>
        </div>
      </div>

      <div
        ref={setLinksPanelRef}
        className="relative grid min-h-0 min-w-0 auto-rows-max gap-0 overflow-visible border border-border bg-background/60 backdrop-blur-sm"
        style={{
          borderColor: section.accentColor,
          gridTemplateColumns: `repeat(${columnSpan}, max-content)`,
        }}
      >
        <LinkDropTargetOverlay
          visible={linkDropTargetActive}
          message="Move to this section"
        />
        {section.links.map((link) => (
          <SectionLinkDraggable
            key={link.id}
            sectionId={section.id}
            linkId={link.id}
            link={link}
            editMode={sectionEditMode}
          >
            <LinkCard
              link={link}
              editMode={sectionEditMode}
              onEdit={() => onEditLink(link.id)}
              accentColor={section.accentColor}
            />
          </SectionLinkDraggable>
        ))}
        {sectionEditMode && onCanvasColumnSpanChange && (
          <button
            type="button"
            aria-label="Resize section width"
            className="absolute right-0 bottom-0 z-40 size-4 translate-x-1/2 translate-y-1/2 cursor-se-resize touch-none rounded-full border-2 border-background shadow-md ring-2 ring-background/90"
            style={{ backgroundColor: section.accentColor }}
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const linkCap = maxCanvasColumnSpanForSection(section)
              const outer = frameOuterElRef.current
              const links = linksPanelElRef.current
              const pOut =
                outer != null
                  ? readHorizontalPaddingPx(
                      outer,
                      SECTION_FRAME_OUTER_PADDING_X
                    )
                  : SECTION_FRAME_OUTER_PADDING_X
              const pLinks =
                links != null
                  ? readHorizontalPaddingPx(
                      links,
                      SECTION_LINKS_INNER_PADDING_X
                    )
                  : SECTION_LINKS_INNER_PADDING_X
              const bLinks =
                links != null
                  ? readHorizontalBorderPx(links)
                  : SECTION_LINKS_BORDER_X
              const outerW =
                outer?.getBoundingClientRect().width ??
                sectionFrameOuterWidthPx(effectiveCanvasColumnSpan(section))
              const startTileInner = outerW - pOut - pLinks - bLinks
              const startSpan = canvasColumnSpanFromTargetWidth(
                startTileInner,
                linkCap
              )
              resizeDragRef.current = {
                pointerId: e.pointerId,
                startClientX: e.clientX,
                startTileInner,
                linkCap,
              }
              lastResizeSpanRef.current = startSpan
              lastResizeLoggedSpanRef.current = null
              setResizePreviewSpan(startSpan)
              sectionResizeDebugLog({
                event: "resizePointerDown",
                sectionId: section.id,
                linkCount: section.links.length,
                linkCap,
                outerPaddingPx: pOut,
                linksPaddingPx: pLinks,
                linksBorderPx: bLinks,
                outerWidth: outerW,
                tileInnerWidth: startTileInner,
                startSpan,
                storedCanvasColumnSpan: section.canvasColumnSpan ?? null,
                effectiveSpan: effectiveCanvasColumnSpan(section),
              })
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              const session = resizeDragRef.current
              if (!session || e.pointerId !== session.pointerId) return
              const delta = e.clientX - session.startClientX
              const targetTileInner = session.startTileInner + delta
              const next = canvasColumnSpanFromTargetWidth(
                targetTileInner,
                session.linkCap
              )
              lastResizeSpanRef.current = next
              setResizePreviewSpan(next)
              if (next !== lastResizeLoggedSpanRef.current) {
                lastResizeLoggedSpanRef.current = next
                sectionResizeDebugLog({
                  event: "resizePointerMove",
                  sectionId: section.id,
                  targetTileInner,
                  span: next,
                  linkCap: session.linkCap,
                  delta,
                })
              }
            }}
            onPointerUp={(e) => {
              endResizeGesture(e.currentTarget, e.pointerId, true)
            }}
            onPointerCancel={(e) => {
              endResizeGesture(e.currentTarget, e.pointerId, false)
            }}
          />
        )}
      </div>
    </div>
  )
}
