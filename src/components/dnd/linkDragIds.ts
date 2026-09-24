import { UNGROUPED_SECTION_ID } from "@/types"

export const FLOATING_LINK_ID_PREFIX = "float:" as const

export const CROPPED_PAGE_ID_PREFIX = "crop:" as const

export function croppedPageDragId(pageId: string): string {
  return `${CROPPED_PAGE_ID_PREFIX}${pageId}`
}

export function floatingLinkDragId(linkId: string): string {
  return `${FLOATING_LINK_ID_PREFIX}${linkId}`
}

export const SECTION_LINK_DRAG_PREFIX = "slink:" as const

export const DROP_SECTION_PREFIX = "drop-section:" as const

export const DROP_STANDALONE_ID = "drop-standalone" as const

export function sectionLinkDragId(sectionId: string, linkId: string): string {
  return `${SECTION_LINK_DRAG_PREFIX}${sectionId}:${linkId}`
}

export function parseSectionLinkDragId(
  id: string
): { sectionId: string; linkId: string } | null {
  if (!id.startsWith(SECTION_LINK_DRAG_PREFIX)) return null
  const rest = id.slice(SECTION_LINK_DRAG_PREFIX.length)
  const colon = rest.indexOf(":")
  if (colon < 0) return null
  return {
    sectionId: rest.slice(0, colon),
    linkId: rest.slice(colon + 1),
  }
}

export function dropSectionDroppableId(sectionId: string): string {
  return `${DROP_SECTION_PREFIX}${sectionId}`
}

export function parseDropSectionId(
  id: string | number | undefined
): string | null {
  if (id === undefined || id === null) return null
  const s = String(id)
  if (!s.startsWith(DROP_SECTION_PREFIX)) return null
  return s.slice(DROP_SECTION_PREFIX.length)
}

/** Target section id for a drop zone, or ungrouped for the canvas “outside sections” zone. */
export function targetSectionIdFromDropOver(overId: string): string | null {
  if (overId === DROP_STANDALONE_ID) return UNGROUPED_SECTION_ID
  return parseDropSectionId(overId)
}
