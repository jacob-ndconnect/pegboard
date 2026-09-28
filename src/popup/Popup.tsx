import { useEffect, useLayoutEffect, useState } from "react"
import { BrowserIcon, LinkSimpleIcon } from "@phosphor-icons/react/dist/ssr"
import { Button } from "@/components/ui/button"
import { LinkEditor } from "@/components/editor/LinkEditor"
import {
  appendStandalonePin,
  canonicalPinUrl,
} from "@/lib/appendStandalonePin"
import { updateStoredAppState } from "@/lib/commitAppState"
import { usableFaviconUrl } from "@/lib/favicon"
import { toolbarCutoutSearch } from "@/lib/toolbarCutout"
import type { Link } from "@/types"

type WebTab = { url: string; title: string; favIconUrl?: string }

/** Chrome sizes this popup from the document width, not from inner content. */
const POPUP_WIDTH = { menu: "13rem", shortcut: "28rem" } as const

function isWebTab(tab: WebTab | "loading" | "unsupported"): tab is WebTab {
  return tab !== "loading" && tab !== "unsupported"
}

export function Popup() {
  const [tab, setTab] = useState<WebTab | "loading" | "unsupported">("loading")
  const [step, setStep] = useState<"menu" | "shortcut">("menu")
  const [notice, setNotice] = useState<string | null>(null)

  useLayoutEffect(() => {
    const width = POPUP_WIDTH[step]
    document.documentElement.style.width = width
    document.body.style.width = width
  }, [step])

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const current = tabs[0]
      const url = current?.url?.trim() ?? ""
      if (!canonicalPinUrl(url)) {
        setTab("unsupported")
        return
      }
      setTab({
        url,
        title: current?.title?.trim() ?? "",
        favIconUrl: usableFaviconUrl(current?.favIconUrl),
      })
    })
  }, [])

  const openCutout = () => {
    if (!isWebTab(tab)) return
    const search = toolbarCutoutSearch(tab.url, tab.title)
    void chrome.tabs.create({
      url: chrome.runtime.getURL(`index.html?${search}`),
    })
    window.close()
  }

  const saveShortcut = async (link: Link) => {
    setNotice(null)
    const result = await updateStoredAppState((prev) => {
      const outcome = appendStandalonePin(prev, link.url, link.label, {
        id: link.id,
        searchTerms: link.searchTerms,
        badge: link.badge,
        invertIcon: link.invertIcon,
      })
      if (outcome === "duplicate" || outcome === "invalid") return outcome
      return outcome.next
    })
    if (result === "duplicate") {
      setNotice("This page is already on your board.")
      return false
    }
    if (result === "invalid") {
      setNotice("That address can't be saved.")
      return false
    }
    window.close()
  }

  if (step === "shortcut" && isWebTab(tab)) {
    return (
      <LinkEditor
        embedded
        open
        onOpenChange={() => {}}
        link={null}
        initialUrl={tab.url}
        initialLabel={tab.title}
        notice={notice}
        previewIconUrl={tab.favIconUrl}
        onBack={() => {
          setNotice(null)
          setStep("menu")
        }}
        onSave={saveShortcut}
      />
    )
  }

  const ready = isWebTab(tab)

  return (
    <div className="w-52 bg-background p-1">
      {tab === "loading" ? (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          Checking this tab…
        </p>
      ) : null}
      {tab === "unsupported" ? (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          Open a normal web page to add it to PegBoard.
        </p>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full cursor-pointer justify-start gap-2 rounded-none"
        disabled={!ready}
        onClick={() => setStep("shortcut")}
      >
        <LinkSimpleIcon className="size-4" />
        Add shortcut
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full cursor-pointer justify-start gap-2 rounded-none"
        disabled={!ready}
        onClick={openCutout}
      >
        <BrowserIcon className="size-4" />
        Add cutout
      </Button>
    </div>
  )
}
