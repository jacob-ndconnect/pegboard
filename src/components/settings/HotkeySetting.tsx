import { useHotkeyRecorder, formatForDisplay } from "@tanstack/react-hotkeys"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"

type HotkeySettingProps = {
  label: string
  description?: string
  value: string
  onChange: (hotkey: string) => void
  allowEmpty?: boolean
}

export function HotkeySetting({
  label,
  description,
  value,
  onChange,
  allowEmpty = false,
}: HotkeySettingProps) {
  const recorder = useHotkeyRecorder({
    onRecord: (hotkey) => onChange(hotkey ?? value),
    onCancel: () => {},
  })

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground/80">{description}</p>
      )}
      <div className="flex items-center gap-2">
        <div className="flex min-h-8 flex-1 items-center gap-1 rounded border border-input bg-muted/30 px-2.5">
          {recorder.isRecording ? (
            <span className="text-xs text-muted-foreground">
              Press a key combination...
            </span>
          ) : value ? (
            <Kbd className="rounded">{formatForDisplay(value)}</Kbd>
          ) : (
            <span className="text-xs text-muted-foreground">Off</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={recorder.isRecording ? recorder.cancelRecording : recorder.startRecording}
          className="shrink-0 cursor-pointer"
        >
          {recorder.isRecording ? "Cancel" : "Change"}
        </Button>
        {allowEmpty && value && !recorder.isRecording ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="shrink-0 cursor-pointer"
          >
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  )
}
