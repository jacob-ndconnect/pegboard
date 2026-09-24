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
  initialAccentColor?: string
  onContinue: (url: string, accentColor: string, label: string) => void
}

export function CroppedPageSetupDialog({
  open,
  onOpenChange,
  initialUrl = "",
  initialAccentColor = DEFAULT_COLOR,
  onContinue,
}: CroppedPageSetupDialogProps) {
  const [url, setUrl] = useState(initialUrl)
  const [label, setLabel] = useState("")
  const [accentColor, setAccentColor] = useState(initialAccentColor)

  useEffect(() => {
    if (open) {
      setUrl(initialUrl)
      setLabel("")
      setAccentColor(initialAccentColor)
    }
  }, [open, initialUrl, initialAccentColor])

  const handleContinue = () => {
    const normalized = normalizeUrlInput(url)
    if (!normalized) return
    const nextLabel = label.trim() || croppedPageLabelFromUrl(normalized)
    onContinue(normalized, accentColor, nextLabel)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle>Add cutout</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[min(70vh,28rem)]">
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="cropped-page-url">
                Url
              </label>
              <Input
                id="cropped-page-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="cropped-page-label">
                Label
              </label>
              <Input
                id="cropped-page-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Deployments"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Accent color</span>
              <ColorPickerPopover
                value={accentColor}
                onValueChange={(_, parsed) => setAccentColor(parsed.hex)}
                swatches={[...COLOR_SWATCHES]}
                hideEyedropper
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="border-t border-border px-4 py-3">
          <Button
            type="button"
            onClick={handleContinue}
            className="gap-1.5"
            disabled={!normalizeUrlInput(url)}
          >
            <FloppyDiskIcon className="size-4" />
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
