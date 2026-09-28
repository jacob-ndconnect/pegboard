import { useEffect, useState } from "react"
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
import { ColorPickerPopover } from "@/components/ui/color-picker"
import { COLOR_SWATCHES } from "@/lib/color-swatches"
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/ssr"
import { croppedPageLabelFromUrl } from "@/lib/croppedPage"

const DEFAULT_COLOR = "#83CE6C"

function normalizeUrlInput(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

type CroppedPageSetupDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialUrl?: string
  initialLabel?: string
  initialAccentColor?: string
  onContinue: (url: string, accentColor: string, label: string) => void
}

export function CroppedPageSetupDialog({
  open,
  onOpenChange,
  initialUrl = "",
  initialLabel = "",
  initialAccentColor = DEFAULT_COLOR,
  onContinue,
}: CroppedPageSetupDialogProps) {
  const [url, setUrl] = useState(initialUrl)
  const [label, setLabel] = useState(initialLabel)
  const [accentColor, setAccentColor] = useState(initialAccentColor)

  useEffect(() => {
    if (open) {
      setUrl(initialUrl)
      setLabel(initialLabel)
      setAccentColor(initialAccentColor)
    }
  }, [open, initialUrl, initialLabel, initialAccentColor])

  const handleContinue = () => {
    const normalized = normalizeUrlInput(url)
    if (!normalized) return
    const nextLabel = label.trim() || croppedPageLabelFromUrl(normalized)
    onContinue(normalized, accentColor, nextLabel)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Add Cutout</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[min(70dvh,calc(90dvh-10rem))]">
          <div className="flex flex-col gap-4 px-6 py-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="cropped-page-url"
                className="text-xs font-medium text-muted-foreground"
              >
                Url
              </label>
              <Input
                id="cropped-page-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="cropped-page-label"
                className="text-xs font-medium text-muted-foreground"
              >
                Label
              </label>
              <Input
                id="cropped-page-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Deployments"
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Accent color
              </label>
              <ColorPickerPopover
                value={accentColor}
                onValueChange={(_, parsed) => setAccentColor(parsed.hex)}
                swatches={[...COLOR_SWATCHES]}
                hideEyedropper
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              size="lg"
              className="cursor-pointer rounded-full"
              onClick={handleContinue}
              disabled={!normalizeUrlInput(url)}
            >
              <FloppyDiskIcon /> Continue
            </Button>
          </DialogFooter>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
