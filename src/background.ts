/// <reference types="chrome"/>

import type { AppState, Link, Section } from "@/types"
import {
  APP_STATE_STORAGE_KEY,
  LAST_KNOWN_APP_STATE_KEY,
} from "@/lib/appStateStorageKey"
import { DEFAULT_APP_STATE, DEFAULT_SETTINGS } from "@/lib/defaultAppState"
import { appendStandalonePin } from "@/lib/appendStandalonePin"
import {
  preferIncoming,
  stampAppState,
} from "@/lib/appStateRevision"

const MAX_SUGGESTIONS = 6
const CONTEXT_MENU_PIN_ID = "pegboard-pin-to-standalone"

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function matchesQuery(link: Link, query: string): boolean {
  const q = query.toLowerCase().trim()
  if (!q) return true
  const label = link.label.toLowerCase()
  const domain = getDomain(link.url).toLowerCase()
  const terms = (link.searchTerms ?? "").toLowerCase()
  return label.includes(q) || domain.includes(q) || terms.includes(q)
}

function collectMatchingLinks(
  sections: Section[],
  standaloneLinks: AppState["standaloneLinks"],
  query: string
): Link[] {
  const results: Link[] = []
  for (const section of sections) {
    for (const link of section.links) {
      if (matchesQuery(link, query)) {
        results.push(link)
        if (results.length >= MAX_SUGGESTIONS) return results
      }
    }
  }
  for (const { link } of standaloneLinks) {
    if (matchesQuery(link, query)) {
      results.push(link)
      if (results.length >= MAX_SUGGESTIONS) return results
    }
  }
  return results
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function coalesceAppState(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_APP_STATE }
  }
  const r = raw as Partial<AppState>
  const updatedAt =
    typeof r.updatedAt === "number" &&
    Number.isFinite(r.updatedAt) &&
    r.updatedAt > 0
      ? r.updatedAt
      : undefined
  return {
    sections: Array.isArray(r.sections) ? r.sections : [],
    standaloneLinks: Array.isArray(r.standaloneLinks) ? r.standaloneLinks : [],
    layoutMode:
      r.layoutMode === "list" ||
      r.layoutMode === "folders" ||
      r.layoutMode === "canvas"
        ? r.layoutMode
        : DEFAULT_APP_STATE.layoutMode,
    editMode: r.editMode === true,
    settings: { ...DEFAULT_SETTINGS, ...r.settings },
    ...(updatedAt != null ? { updatedAt } : {}),
  }
}

function registerContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_PIN_ID,
      title: "Pin to PegBoard",
      contexts: ["page", "link"],
    })
  })
}

chrome.runtime.onInstalled.addListener(registerContextMenus)

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_PIN_ID) return
  const url = (info.linkUrl ?? tab?.url)?.trim()
  if (!url) return

  const label =
    info.linkUrl != null && info.linkUrl !== ""
      ? ""
      : (tab?.title?.trim() ?? "")

  chrome.storage.sync.get(APP_STATE_STORAGE_KEY, (syncResult) => {
    if (chrome.runtime.lastError) return
    chrome.storage.local.get(LAST_KNOWN_APP_STATE_KEY, (localResult) => {
      const fromSync = coalesceAppState(syncResult[APP_STATE_STORAGE_KEY])
      const fromLocal = coalesceAppState(localResult[LAST_KNOWN_APP_STATE_KEY])
      const prev = preferIncoming(fromLocal, fromSync, "hydrating")
        ? fromLocal
        : fromSync
      const outcome = appendStandalonePin(prev, url, label)
      if (outcome === "invalid" || outcome === "duplicate") return
      const next = stampAppState(outcome.next)
      chrome.storage.sync.set({ [APP_STATE_STORAGE_KEY]: next })
      chrome.storage.local.set({ [LAST_KNOWN_APP_STATE_KEY]: next })
    })
  })
})

chrome.omnibox.setDefaultSuggestion({
  description: "Type to search pinned links",
})

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  chrome.storage.sync.get(APP_STATE_STORAGE_KEY, (result) => {
    const appState = result[APP_STATE_STORAGE_KEY] as AppState | undefined
    const sections = appState?.sections ?? []
    const standaloneLinks = appState?.standaloneLinks ?? []
    const matches = collectMatchingLinks(sections, standaloneLinks, text)
    const suggestions = matches.map((link) => {
      const domain = getDomain(link.url)
      const display = link.searchTerms ?? link.label
      const desc = domain
        ? `${escapeXml(display)} — ${escapeXml(domain)}`
        : escapeXml(display)
      return { content: link.url, description: desc }
    })
    if (matches.length > 0) {
      const firstDesc = suggestions[0].description
      chrome.omnibox.setDefaultSuggestion({ description: firstDesc })
      suggest(suggestions.slice(1))
    } else {
      chrome.omnibox.setDefaultSuggestion({
        description: "Type to search pinned links",
      })
      suggest([])
    }
  })
})

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const openInNewTab =
    disposition === "newForegroundTab" || disposition === "newBackgroundTab"
  const navigate = (navUrl: string) => {
    if (openInNewTab) chrome.tabs.create({ url: navUrl })
    else
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) chrome.tabs.update(tabs[0].id, { url: navUrl })
      })
  }
  if (text.startsWith("http")) {
    navigate(text)
    return
  }
  chrome.storage.sync.get(APP_STATE_STORAGE_KEY, (result) => {
    const appState = result[APP_STATE_STORAGE_KEY] as AppState | undefined
    const sections = appState?.sections ?? []
    const standaloneLinks = appState?.standaloneLinks ?? []
    const matches = collectMatchingLinks(sections, standaloneLinks, text)
    if (matches.length > 0) navigate(matches[0].url)
  })
})
