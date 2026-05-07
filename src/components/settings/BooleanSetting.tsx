import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type BooleanSettingProps = {
  id: string
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function BooleanSetting({
  id,
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: BooleanSettingProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <label
          htmlFor={id}
          className={cn(
            "block text-xs font-medium",
            disabled
              ? "cursor-not-allowed text-muted-foreground/60"
              : "cursor-pointer text-muted-foreground"
          )}
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground/80">{description}</p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="mt-0.5 shrink-0"
      />
    </div>
  )
}
