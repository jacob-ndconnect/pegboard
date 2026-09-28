import { canonicalPinUrl } from "@/lib/appendStandalonePin"

export const TOOLBAR_CUTOUT_PARAM = "cutout"
export const TOOLBAR_CUTOUT_LABEL_PARAM = "cutoutLabel"

export function readToolbarCutoutIntent(
  search: string
): { url: string; label: string } | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  )
  const url = params.get(TOOLBAR_CUTOUT_PARAM)?.trim() ?? ""
  if (!canonicalPinUrl(url)) return null
  return {
    url,
    label: params.get(TOOLBAR_CUTOUT_LABEL_PARAM)?.trim() ?? "",
  }
}

export function toolbarCutoutSearch(url: string, label: string): string {
  const params = new URLSearchParams()
  params.set(TOOLBAR_CUTOUT_PARAM, url)
  const trimmed = label.trim()
  if (trimmed) params.set(TOOLBAR_CUTOUT_LABEL_PARAM, trimmed)
  return params.toString()
}
