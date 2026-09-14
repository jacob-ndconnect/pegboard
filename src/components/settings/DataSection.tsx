import { useCallback, useRef, useState } from "react"
import { DownloadSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react"
import type { AppState } from "@/types"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import {
  downloadConfigYaml,
  parseConfigTextAsync,
  serializeConfigYaml,
  type PegboardTheme,
} from "@/lib/pegboardConfig"

type DataSectionContentProps = {
  state: AppState
  onReplaceState: (state: AppState) => void
}

export function DataSectionContent({
  state,
  onReplaceState,
}: DataSectionContentProps) {
  const { theme, setTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(
    null
  )
  const [busy, setBusy] = useState(false)

  const handleExport = useCallback(async () => {
    setStatus(null)
    setBusy(true)
    try {
      const yaml = await serializeConfigYaml(state, theme as PegboardTheme)
      downloadConfigYaml(yaml)
      setStatus({ kind: "success", text: "Downloaded pegboard.yml." })
    } catch {
      setStatus({ kind: "error", text: "Export failed." })
    } finally {
      setBusy(false)
    }
  }, [state, theme])

  const handleImportClick = useCallback(() => {
    setStatus(null)
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file) return

      const confirmed = window.confirm(
        "Import replaces all sections, ungrouped links, layout mode, and settings with the file contents. Continue?"
      )
      if (!confirmed) return

      setBusy(true)
      setStatus(null)
      try {
        const text = await file.text()
        const result = await parseConfigTextAsync(text)
        if (!result.ok) {
          setStatus({ kind: "error", text: result.error })
          return
        }
        onReplaceState(result.appState)
        if (result.theme) {
          setTheme(result.theme)
        }
        setStatus({ kind: "success", text: "Import complete." })
      } catch {
        setStatus({ kind: "error", text: "Could not read the file." })
      } finally {
        setBusy(false)
      }
    },
    [onReplaceState, setTheme]
  )

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-muted-foreground/80">
        Export your board to a YAML config file (pegboard.yml). Import replaces
        everything stored in sync: sections, ungrouped links, layout, and
        settings. Theme is included when present in the file.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer gap-2"
          disabled={busy}
          onClick={() => void handleExport()}
        >
          <DownloadSimpleIcon className="size-4" weight="regular" />
          Export
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer gap-2"
          disabled={busy}
          onClick={handleImportClick}
        >
          <UploadSimpleIcon className="size-4" weight="regular" />
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".yml,.yaml,.json,application/x-yaml,text/yaml,application/json"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
      </div>
      {status && (
        <p
          className={
            status.kind === "error"
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
          role="status"
        >
          {status.text}
        </p>
      )}
    </div>
  )
}
