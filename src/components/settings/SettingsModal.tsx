import { useCallback } from "react"
import { GearIcon } from "@phosphor-icons/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs-classic"
import type { AppState, Settings } from "@/types"
import { useTheme } from "@/components/theme-provider"
import { SETTINGS_SECTIONS, THEME_OPTIONS } from "./settingsConfig"
import type { SettingConfig } from "./settingsConfig"
import { BooleanSetting } from "./BooleanSetting"
import { HotkeySetting } from "./HotkeySetting"
import { InfoSetting } from "./InfoSetting"
import { SelectSetting } from "./SelectSetting"

function ThemeSetting({
  label,
  description,
}: {
  label: string
  description?: string
}) {
  const { theme, setTheme } = useTheme()
  return (
    <SelectSetting
      id="theme"
      label={label}
      description={description}
      value={theme}
      options={THEME_OPTIONS}
      onChange={(value) => {
        if (value === "light" || value === "dark" || value === "system") {
          setTheme(value)
        }
      }}
    />
  )
}

type SettingsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: AppState
  settings: Settings
  onSave: (settings: Settings) => void
  onReplaceState: (state: AppState) => void
}

function renderSetting(
  config: SettingConfig,
  settings: Settings,
  onChange: (key: keyof Settings, value: string | boolean) => void
) {
  if (config.type === "theme") {
    return (
      <ThemeSetting
        key={config.id}
        label={config.label}
        description={config.description}
      />
    )
  }
  if (config.type === "hotkey") {
    return (
      <HotkeySetting
        key={config.id}
        label={config.label}
        description={config.description}
        value={settings[config.id] as string}
        onChange={(value) => onChange(config.id, value)}
      />
    )
  }
  if (config.type === "info" && config.infoValue) {
    return (
      <InfoSetting
        key={config.id}
        label={config.label}
        description={config.description ?? ""}
        value={config.infoValue}
      />
    )
  }
  if (config.type === "select" && config.options) {
    return (
      <SelectSetting
        key={config.id}
        id={config.id}
        label={config.label}
        description={config.description}
        value={settings[config.id] as string}
        options={config.options}
        onChange={(value) => onChange(config.id, value)}
      />
    )
  }
  if (config.type === "boolean") {
    const disabled =
      !settings.canvasRememberScroll &&
      (config.id === "canvasScrollSync" ||
        config.id === "canvasRestoreScrollOnResize")
    return (
      <BooleanSetting
        key={config.id}
        id={config.id}
        label={config.label}
        description={config.description}
        checked={settings[config.id] as boolean}
        disabled={disabled}
        onChange={(checked) => onChange(config.id, checked)}
      />
    )
  }
  return null
}

export function SettingsModal({
  open,
  onOpenChange,
  state,
  settings,
  onSave,
  onReplaceState,
}: SettingsModalProps) {
  const handleSettingChange = useCallback(
    (key: keyof Settings, value: string | boolean) => {
      if (key === "canvasRememberScroll" && value === false) {
        onSave({
          ...settings,
          canvasRememberScroll: false,
          canvasScrollSync: false,
          canvasRestoreScrollOnResize: false,
        })
        return
      }
      onSave({ ...settings, [key]: value })
    },
    [settings, onSave]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] min-h-[min(600px,90vh)] max-w-[560px] flex-col gap-0 p-0 sm:max-w-[720px]"
        showCloseButton={true}
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-4 border-b px-4 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <GearIcon className="size-4" weight="regular" />
            Settings
          </DialogTitle>
        </DialogHeader>
        <Tabs
          defaultValue={SETTINGS_SECTIONS[0].id}
          orientation="vertical"
          className="flex min-h-0 flex-1"
        >
          <div className="flex min-h-0 flex-1 flex-row">
            <TabsList
              variant="line"
              className="flex h-auto w-fit min-w-40 shrink-0 flex-col items-stretch justify-start gap-0 rounded-none border-r bg-transparent p-0"
            >
              {SETTINGS_SECTIONS.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="inline-flex w-full flex-row items-center gap-2 text-left cursor-pointer justify-start rounded-none border-r-2 border-transparent px-4 py-2 data-[state=active]:border-r-2 data-[state=active]:border-primary data-[state=active]:bg-accent/50"
                >
                  {section.icon && (
                    <section.icon
                      className="size-4 shrink-0"
                      weight="regular"
                    />
                  )}
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {SETTINGS_SECTIONS.map((section) => (
                <TabsContent
                  key={section.id}
                  value={section.id}
                  className="mt-0 flex flex-col gap-6"
                >
                  {section.Content ? (
                    <section.Content
                      state={state}
                      onReplaceState={onReplaceState}
                    />
                  ) : (
                    section.settings?.map((config) =>
                      renderSetting(config, settings, handleSettingChange)
                    )
                  )}
                </TabsContent>
              ))}
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
