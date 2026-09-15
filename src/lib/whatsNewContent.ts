import rawWhatsNew from "@/content/whats-new.md?raw"
import {
  parseWhatsNewMarkdown,
  type WhatsNewContent,
} from "@/lib/whatsNew"

export const WHATS_NEW_CONTENT: WhatsNewContent =
  parseWhatsNewMarkdown(rawWhatsNew)
