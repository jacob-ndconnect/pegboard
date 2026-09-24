export type CroppedPageSlotRole = "canvas" | "expanded" | "editing"

type SlotEntry = Partial<Record<CroppedPageSlotRole, HTMLElement>>

const slots = new Map<string, SlotEntry>()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function registerCroppedPageSlot(
  pageId: string,
  role: CroppedPageSlotRole,
  element: HTMLElement | null
): void {
  const entry = slots.get(pageId) ?? {}
  if (element) entry[role] = element
  else delete entry[role]
  if (entry.canvas || entry.expanded || entry.editing) slots.set(pageId, entry)
  else slots.delete(pageId)
  emit()
}

const ROLE_PRIORITY: CroppedPageSlotRole[] = ["editing", "expanded", "canvas"]

export function activeCroppedPageSlot(
  pageId: string
): { role: CroppedPageSlotRole; element: HTMLElement } | null {
  const entry = slots.get(pageId)
  if (!entry) return null
  for (const role of ROLE_PRIORITY) {
    const element = entry[role]
    if (element) return { role, element }
  }
  return null
}

export function croppedPageSlotElement(
  pageId: string,
  role: CroppedPageSlotRole
): HTMLElement | null {
  return slots.get(pageId)?.[role] ?? null
}

export function subscribeCroppedPageSlots(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
