import { useState, type ReactNode } from "react"
import {
  FoldersIcon,
  ListIcon,
  SquaresFourIcon,
  CloudArrowUpIcon,
} from "@phosphor-icons/react"
import { formatForDisplay } from "@tanstack/react-hotkeys"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { cn, getChromiumBrowserName } from "@/lib/utils"

const STEP_COUNT = 4

type OnboardingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchShortcut: string
}

function LayoutsVisual() {
  const icons = [SquaresFourIcon, ListIcon, FoldersIcon] as const
  return (
    <div className="flex items-center justify-center gap-1 border border-border bg-background/80 p-2 shadow-sm">
      {icons.map((Icon, i) => (
        <div
          key={i}
          className={cn(
            "flex size-9 items-center justify-center border border-border",
            i === 0 && "bg-muted"
          )}
        >
          <Icon className="size-4 text-muted-foreground" weight="regular" />
        </div>
      ))}
    </div>
  )
}

function SearchVisual({ searchShortcut }: { searchShortcut: string }) {
  const parts = formatForDisplay(searchShortcut).split("+")
  return (
    <div className="flex w-full max-w-xs items-center gap-2 border border-border bg-background/80 px-3 py-2 shadow-sm">
      <span className="text-xs text-muted-foreground">Search</span>
      <div className="ml-auto flex gap-0.5">
        {parts.map((part) => (
          <Kbd
            key={part}
            className="rounded-lg bg-muted text-[10px] text-muted-foreground"
          >
            {part}
          </Kbd>
        ))}
      </div>
    </div>
  )
}

function OmniboxVisual() {
  return (
    <div className="w-full max-w-xs rounded-full border border-border bg-background/80 px-3 py-2 text-left shadow-sm">
      <span className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">pb</span> github
      </span>
    </div>
  )
}

function SyncVisual() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="h-14 w-9 border border-border bg-background/80 shadow-sm" />
      <CloudArrowUpIcon
        className="size-8 text-muted-foreground"
        weight="regular"
      />
      <div className="h-14 w-9 border border-border bg-background/80 shadow-sm" />
    </div>
  )
}

function getStepContent(
  step: number,
  searchShortcut: string,
  browserName: "Edge" | "Chrome"
): { visual: ReactNode; body: string } {
  switch (step) {
    case 0:
      return {
        visual: <LayoutsVisual />,
        body: "Switch Canvas, List, or Folders anytime from the top left. Canvas is a free board; List is rows; Folders is a Launchpad-style grid.",
      }
    case 1:
      return {
        visual: <SearchVisual searchShortcut={searchShortcut} />,
        body: "Jump to any pin from the new tab page.",
      }
    case 2:
      return {
        visual: <OmniboxVisual />,
        body: `Type pb in ${browserName}'s address bar to search the same pins without opening a new tab.`,
      }
    case 3:
      return {
        visual: <SyncVisual />,
        body: `Pins, sections, and settings sync with your ${browserName} account when you are signed in. Same board on every device using that profile.`,
      }
    default:
      return { visual: null, body: "" }
  }
}

export function OnboardingModal({
  open,
  onOpenChange,
  searchShortcut,
}: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const browserName = getChromiumBrowserName()
  const { visual, body } = getStepContent(step, searchShortcut, browserName)

  const handleOpenChange = (next: boolean) => {
    if (!next) setStep(0)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-none sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>What else can I do?</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-1">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <div
              key={i}
              className={cn(
                "size-1.5",
                i === step ? "bg-foreground" : "bg-muted-foreground/30"
              )}
              aria-hidden
            />
          ))}
        </div>

        <div
          className="flex min-h-44 items-center justify-center border border-border bg-muted/40 p-6"
          aria-live="polite"
        >
          {visual}
        </div>

        <p className="text-sm text-muted-foreground">{body}</p>

        <div className="flex justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            className="cursor-pointer rounded-none"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < STEP_COUNT - 1 ? (
            <Button
              type="button"
              className="cursor-pointer rounded-none"
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              className="cursor-pointer rounded-none"
              onClick={() => handleOpenChange(false)}
            >
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
