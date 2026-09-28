import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ColorPickerField } from "./ColorPickerField"
import { BooleanSetting } from "@/components/settings/BooleanSetting"
import { LinkCard } from "@/components/canvas/LinkCard"
import { canonicalPinUrl } from "@/lib/appendStandalonePin"
import type { Link } from "@/types"
import { ArrowLeftIcon, FloppyDiskIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr"

const DEFAULT_BADGE_COLOR = "#ef4444"

type LinkEditorProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  link: Link | null
  /** Return false to keep the editor open (for example a duplicate pin). */
  onSave: (link: Link) => void | boolean | Promise<void | boolean>
  onDelete?: (linkId: string) => void
  /** Toolbar popup: fields only, no dialog over a page. */
  embedded?: boolean
  initialUrl?: string
  initialLabel?: string
  onBack?: () => void
  notice?: string | null
  /** Favicon of the open tab, used while the URL still matches that tab. */
  previewIconUrl?: string
}

export function LinkEditor({
  open,
  onOpenChange,
  link,
  onSave,
  onDelete,
  embedded = false,
  initialUrl = "",
  initialLabel = "",
  onBack,
  notice,
  previewIconUrl,
}: LinkEditorProps) {
  const [url, setUrl] = useState(() => link?.url ?? initialUrl)
  const [label, setLabel] = useState(() => link?.label ?? initialLabel)
  const [searchTerms, setSearchTerms] = useState(() => link?.searchTerms ?? "")
  const [badgeEmoji, setBadgeEmoji] = useState(() => link?.badge?.emoji ?? "")
  const [badgeColor, setBadgeColor] = useState(
    () => link?.badge?.color ?? DEFAULT_BADGE_COLOR
  )
  const [invertIcon, setInvertIcon] = useState(() => link?.invertIcon === true)

  const previewIcon =
    previewIconUrl &&
    canonicalPinUrl(url) != null &&
    canonicalPinUrl(url) === canonicalPinUrl(initialUrl)
      ? previewIconUrl
      : undefined

  const previewLink: Link = {
    id: link?.id ?? "preview",
    url: url || "https://example.com",
    label: label || "Link",
    badge:
      badgeEmoji.trim().length > 0
        ? { emoji: badgeEmoji.slice(0, 2), color: badgeColor }
        : undefined,
    invertIcon: invertIcon || undefined,
  }

  const handleSave = () => {
    const trimmedUrl = url.trim()
    const trimmedLabel = label.trim()
    if (!trimmedUrl || !trimmedLabel) return

    void Promise.resolve(
      onSave({
        id: link?.id ?? crypto.randomUUID(),
        url: trimmedUrl,
        label: trimmedLabel,
        searchTerms: searchTerms.trim() || undefined,
        badge:
          badgeEmoji.trim().length > 0
            ? { emoji: badgeEmoji.slice(0, 2), color: badgeColor }
            : undefined,
        ...(invertIcon ? { invertIcon: true } : {}),
        ...(link?.customIcon ? { customIcon: link.customIcon } : {}),
      })
    ).then((stayOpen) => {
      if (stayOpen === false) return
      onOpenChange(false)
    })
  }

  const handleDelete = () => {
    if (link && onDelete) {
      onDelete(link.id)
      onOpenChange(false)
    }
  }

  const isEditing = !!link
  const title = isEditing ? "Edit Link" : embedded ? "Add shortcut" : "Add Link"

  const body = (
    <>
      {embedded ? (
        <div className="flex items-center gap-2 px-4 pt-4">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer rounded-none"
              aria-label="Back"
              onClick={onBack}
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
          ) : null}
          <h2 className="font-heading text-base leading-none font-medium">
            {title}
          </h2>
        </div>
      ) : (
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
      )}
      {notice ? (
        <p className="px-6 pt-2 text-xs text-destructive">{notice}</p>
      ) : null}
      <ScrollArea
        className={
          embedded
            ? "max-h-[520px]"
            : "max-h-[min(70dvh,calc(90dvh-10rem))]"
        }
      >
            <div className="flex flex-col gap-4 px-6 py-2">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="link-url"
              className="text-xs font-medium text-muted-foreground"
            >
              URL
            </label>
            <Input
              id="link-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="link-label"
              className="text-xs font-medium text-muted-foreground"
            >
              Label
            </label>
            <Input
              id="link-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Display name"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="link-search-terms"
              className="text-xs font-medium text-muted-foreground"
            >
              Search terms
            </label>
            <Input
              id="link-search-terms"
              value={searchTerms}
              onChange={(e) => setSearchTerms(e.target.value)}
              placeholder="Longer name for search (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Used in Mod+K search, not shown on canvas or list.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="link-badge"
              className="text-xs font-medium text-muted-foreground"
            >
              Badge emoji (max 2 chars)
            </label>
            <Input
              id="link-badge"
              value={badgeEmoji}
              onChange={(e) => setBadgeEmoji(e.target.value.slice(0, 2))}
              placeholder="🚀 or dev"
              maxLength={2}
            />
          </div>
          {badgeEmoji.trim().length > 0 && (
            <ColorPickerField
              value={badgeColor}
              onChange={setBadgeColor}
              label="Badge color"
            />
          )}
          <BooleanSetting
            id="link-invert-icon"
            label="Invert icon in dark mode"
            description="Use for dark glyphs on a transparent background."
            checked={invertIcon}
            onChange={setInvertIcon}
          />
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Preview
            </span>
            <div className="flex justify-center rounded-lg border border-border bg-muted/30 p-6">
              <LinkCard
                link={previewLink}
                editMode={false}
                iconUrl={previewIcon}
                preferCachedFavicon={embedded}
              />
            </div>
            </div>
            </div>
          <DialogFooter>
            {isEditing && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="text-md mr-auto cursor-pointer rounded-full"
                size="lg"
              >
                Delete <TrashIcon />
              </Button>
            )}
            <Button
              className="text-md cursor-pointer rounded-full"
              size="lg"
              onClick={handleSave}
              disabled={!url.trim() || !label.trim()}
            >
              <FloppyDiskIcon /> Save
            </Button>
          </DialogFooter>
      </ScrollArea>
    </>
  )

  if (embedded) {
    return (
      <div className="flex w-[28rem] flex-col bg-popover text-popover-foreground">
        {body}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="p-0 sm:max-w-md">
        {body}
      </DialogContent>
    </Dialog>
  )
}
