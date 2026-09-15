/**
 * Dev toggles (commit with `false` for production).
 *
 * Reset what's-new ack from the new tab console:
 * `chrome.storage.local.remove('whatsNewSeenId')` then reload the tab.
 */
export const FLAGS = {
  /** Ignore `whatsNewSeenId`; chip stays after dismiss (modal still closes). */
  alwaysShowWhatsNew: false,
} as const
