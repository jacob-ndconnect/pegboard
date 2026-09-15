import { useCallback, useRef, type ReactNode } from "react"
import { COLOR_SWATCHES } from "@/lib/color-swatches"
import { cn } from "@/lib/utils"

type EmptyStateProps = {
  onCreateSection: () => void
  onAddShortcut: () => void
  onImportBackup: (file: File) => Promise<void>
  importError: string | null
  onOpenTour: () => void
}

function SectionMiniature() {
  const accent = COLOR_SWATCHES[4]
  return (
    <div className="flex h-full w-full items-center justify-center p-3">
      <div className="flex w-full max-w-[5.5rem] flex-col border border-border bg-background shadow-sm">
        <div className="flex items-stretch border-b border-border">
          <div className="w-1 shrink-0" style={{ backgroundColor: accent }} />
          <div className="h-2 flex-1 bg-muted/60" />
        </div>
        <div className="grid grid-cols-2 gap-1 p-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className="size-4 border border-border bg-muted/40" />
              <div className="h-0.5 w-5 bg-muted-foreground/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ShortcutMiniature() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-3">
      <div className="flex size-14 items-center justify-center border border-border bg-muted/30 text-lg font-medium text-muted-foreground">
        G
      </div>
      <div className="h-1 w-10 bg-muted-foreground/25" />
    </div>
  )
}

function ImportMiniature() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3">
      <div className="flex w-12 flex-col gap-1 border border-border bg-background p-2 shadow-sm">
        <div className="h-0.5 w-full bg-muted-foreground/25" />
        <div className="h-0.5 w-[80%] bg-muted-foreground/20" />
        <div className="h-0.5 w-full bg-muted-foreground/25" />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">.yml</span>
    </div>
  )
}

type ActionCardProps = {
  label: string
  onClick: () => void
  children: ReactNode
}

function ActionCard({ label, onClick, children }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex aspect-square w-36 min-w-36 shrink-0 cursor-pointer flex-col overflow-hidden",
        "rounded-none border border-border bg-background/95 shadow-sm transition-colors",
        "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      )}
    >
      <div className="pointer-events-none min-h-0 flex-1">{children}</div>
      <span className="border-t border-border px-2 py-2.5 text-center text-sm font-medium">
        {label}
      </span>
    </button>
  )
}

export function EmptyState({
  onCreateSection,
  onAddShortcut,
  onImportBackup,
  importError,
  onOpenTour,
}: EmptyStateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file) return
      void onImportBackup(file)
    },
    [onImportBackup]
  )

  return (
    <div className="relative z-10 flex min-h-svh w-full flex-col items-center justify-center gap-8 px-6 pt-24 pb-12">
      <div className="flex max-w-full justify-center gap-4 overflow-x-auto">
        <ActionCard label="Create a section" onClick={onCreateSection}>
          <SectionMiniature />
        </ActionCard>
        <ActionCard label="Add a shortcut" onClick={onAddShortcut}>
          <ShortcutMiniature />
        </ActionCard>
        <ActionCard label="Import a backup" onClick={handleImportClick}>
          <ImportMiniature />
        </ActionCard>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".yml,.yaml,.json,application/x-yaml,text/yaml,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      {importError ? (
        <p className="text-center text-xs text-destructive" role="status">
          {importError}
        </p>
      ) : null}

      <p className="max-w-sm text-center text-sm text-muted-foreground">
        Or right-click any page and choose Pin to PegBoard.
      </p>

      <button
        type="button"
        onClick={onOpenTour}
        className="cursor-pointer text-center text-sm text-muted-foreground hover:underline"
      >
        What else can I do?
      </button>
    </div>
  )
}
