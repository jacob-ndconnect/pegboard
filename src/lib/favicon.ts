/** Primary source: DuckDuckGo (reliable for arbitrary domains). */
export function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`
  } catch {
    return ""
  }
}

/** http(s) or data URL safe to use as an <img> src in an extension page. */
export function usableFaviconUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  if (
    url.startsWith("https:") ||
    url.startsWith("http:") ||
    url.startsWith("data:")
  ) {
    return url
  }
  return undefined
}

/**
 * Icon URLs to try, in order. `cachedFirst` tries Chrome's favicon cache before
 * DuckDuckGo — the toolbar popup often never finishes the remote request.
 */
export function faviconCandidateUrls(
  pageUrl: string,
  options?: { preferred?: string; cachedFirst?: boolean }
): string[] {
  const remote = getFaviconUrl(pageUrl)
  const cached = getFaviconFallbackUrl(pageUrl)
  const ordered = options?.cachedFirst
    ? [options.preferred, cached, remote]
    : [options?.preferred, remote, cached]
  const seen = new Set<string>()
  const urls: string[] = []
  for (const url of ordered) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    urls.push(url)
  }
  return urls
}

/** Fallback when primary fails; only available in extension context. */
export function getFaviconFallbackUrl(url: string, size = 64): string {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime?.id) {
      const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"))
      faviconUrl.searchParams.set("pageUrl", url)
      faviconUrl.searchParams.set("size", String(size))
      return faviconUrl.toString()
    }
  } catch {
    // ignore
  }
  return ""
}
