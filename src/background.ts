/// <reference types="chrome"/>

import type { AppState, Link, Section } from "@/types"
import { appendStandalonePin } from "@/lib/appendStandalonePin"
import {
  loadMutableAppState,
  writeMutableAppState,
} from "@/lib/commitAppState"
import { stampAppState } from "@/lib/appStateRevision"
import { enableIframeEmbedHeaders } from "@/lib/iframeEmbedHeaders"
import { readBoardForOmnibox } from "@/lib/readBoardForBackground"

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

function registerContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_PIN_ID,
      title: "Pin to PegBoard",
      contexts: ["page", "link"],
    })
  })
}

function installEmbedHeaderBypass(): void {
  void enableIframeEmbedHeaders()
}

chrome.runtime.onInstalled.addListener(() => {
  registerContextMenus()
  installEmbedHeaderBypass()
})
chrome.runtime.onStartup.addListener(installEmbedHeaderBypass)

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_PIN_ID) return
  const url = (info.linkUrl ?? tab?.url)?.trim()
  if (!url) return

  const label =
    info.linkUrl != null && info.linkUrl !== ""
      ? ""
      : (tab?.title?.trim() ?? "")

  void (async () => {
    const { prev, accountSyncEnabled, flagWasAbsent } =
      await loadMutableAppState()
    const outcome = appendStandalonePin(prev, url, label)
    if (outcome === "invalid" || outcome === "duplicate") return
    const next = stampAppState(outcome.next)
    await writeMutableAppState(next, accountSyncEnabled, flagWasAbsent)
  })()
})

chrome.omnibox.setDefaultSuggestion({
  description: "Type to search pinned links",
})

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  readBoardForOmnibox((appState) => {
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
  readBoardForOmnibox((appState) => {
    const sections = appState?.sections ?? []
    const standaloneLinks = appState?.standaloneLinks ?? []
    const matches = collectMatchingLinks(sections, standaloneLinks, text)
    if (matches.length > 0) navigate(matches[0].url)
  })
})
