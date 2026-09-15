import { parse as parseYaml } from "yaml"

export const WHATS_NEW_SEEN_ID_KEY = "whatsNewSeenId"

export type WhatsNewContent = {
  id: number
  title: string
  bodyMarkdown: string
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/

export function parseWhatsNewMarkdown(raw: string): WhatsNewContent {
  const match = FRONTMATTER_RE.exec(raw.trim())
  if (!match) {
    throw new Error("whats-new.md must start with YAML frontmatter (---).")
  }
  const frontmatter = parseYaml(match[1]) as Record<string, unknown>
  const id =
    typeof frontmatter.id === "number" && Number.isInteger(frontmatter.id)
      ? frontmatter.id
      : null
  if (id === null || id < 1) {
    throw new Error("whats-new.md frontmatter id must be a positive integer.")
  }
  const title =
    typeof frontmatter.title === "string" && frontmatter.title.trim()
      ? frontmatter.title.trim()
      : "What's new"
  return {
    id,
    title,
    bodyMarkdown: match[2].trim(),
  }
}

export function shouldShowWhatsNewChip(
  seenId: number | undefined,
  announcementId: number
): boolean {
  return seenId !== announcementId
}

export function readWhatsNewSeenId(): Promise<number | undefined> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve(undefined)
      return
    }
    chrome.storage.local.get(WHATS_NEW_SEEN_ID_KEY, (result) => {
      if (chrome.runtime.lastError) {
        resolve(undefined)
        return
      }
      const raw = result[WHATS_NEW_SEEN_ID_KEY]
      if (typeof raw === "number" && Number.isInteger(raw)) {
        resolve(raw)
        return
      }
      resolve(undefined)
    })
  })
}

export function writeWhatsNewSeenId(id: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve()
      return
    }
    chrome.storage.local.set({ [WHATS_NEW_SEEN_ID_KEY]: id }, () => {
      resolve()
    })
  })
}
