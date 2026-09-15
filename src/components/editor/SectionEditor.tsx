import { useState, useEffect } from "react"
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
import type { Section } from "@/types"
import { FloppyDiskIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr"

type SectionEditorProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  section: Section | null
  onSave: (section: Section) => void
  onDelete?: (sectionId: string) => void
}

const DEFAULT_COLOR = "#83CE6C"

export function SectionEditor({
  open,
  onOpenChange,
  section,
  onSave,
  onDelete,
}: SectionEditorProps) {
  const [name, setName] = useState("")
  const [accentColor, setAccentColor] = useState(DEFAULT_COLOR)

  useEffect(() => {
    if (open) {
      setName(section?.name ?? "")
      setAccentColor(section?.accentColor ?? DEFAULT_COLOR)
    }
  }, [open, section])

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return

    onSave({
      id: section?.id ?? crypto.randomUUID(),
      name: trimmed,
      accentColor,
      links: section?.links ?? [],
      position: section?.position ?? { x: 40, y: 40 },
      canvasColumnSpan: section?.canvasColumnSpan,
    })
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (section && onDelete) {
      onDelete(section.id)
      onOpenChange(false)
    }
  }

  const isEditing = !!section

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{section ? "Edit Section" : "Add Section"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[min(70dvh,calc(90dvh-10rem))]">
          <div className="flex flex-col gap-4 px-6 py-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="section-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Section name
              </label>
              <Input
                id="section-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Work, Personal"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
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
            {isEditing && onDelete && (
              <Button
                variant="destructive"
                size="lg"
                className="mr-auto cursor-pointer rounded-full"
                onClick={handleDelete}
              >
                Delete <TrashIcon />
              </Button>
            )}
            <Button
              size="lg"
              className="cursor-pointer rounded-full"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              <FloppyDiskIcon /> Save
            </Button>
          </DialogFooter>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
