import type { ComponentType, ElementType } from "react"
import {
  CloudArrowUpIcon,
  DatabaseIcon,
  HeartIcon,
  KeyboardIcon,
  PaintBrushIcon,
} from "@phosphor-icons/react"
import type { AppState, Settings } from "@/types"
import { SupportSectionContent } from "./SupportSection"
import { DataSectionContent } from "./DataSection"

//IMAGES
import devAvatar from "@/assets/me_and_meebo.jpg"

const SECTION_LABEL_SIZE_OPTIONS = [
  { value: "text-xs", label: "Extra small" },
  { value: "text-sm", label: "Small" },
  { value: "text-base", label: "Base" },
  { value: "text-lg", label: "Large" },
  { value: "text-xl", label: "Extra large" },
  { value: "text-2xl", label: "2XL" },
  { value: "text-3xl", label: "3XL" },
] as const

export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const

export type SettingConfig =
  | {
      id: keyof Settings
      label: string
      description?: string
      type: "hotkey" | "select" | "boolean"
      options?: readonly { value: string; label: string }[]
      allowEmpty?: boolean
    }
  | {
      id: "omniboxKeyword"
      label: string
      description?: string
      type: "info"
      infoValue: string
    }
  | {
      id: "theme"
      label: string
      description?: string
      type: "theme"
    }

export type SupportLink = {
  label: string
  url: string
}

export type SupportSectionConfig = {
  avatar: string
  buyMeACoffee: string
  links: SupportLink[]
}

export type SettingsSection = {
  id: string
  label: string
  icon?: ElementType
  settings?: SettingConfig[]
  Content?: ComponentType<{
    state: AppState
    onReplaceState: (state: AppState) => void
  }>
}

// Support section config — update with your details
export const SUPPORT_CONFIG: SupportSectionConfig = {
  avatar: devAvatar, // Add your photo to public/dev-avatar.png
  buyMeACoffee: "https://buymeacoffee.com/jacobestep",
  links: [
    { label: "GitHub", url: "https://github.com/jacob-ndconnect" },
    { label: "Twitter", url: "https://x.com/jacob_estep_dev" },
    { label: "Portfolio", url: "https://jacobestep.com/" },
  ],
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "keyboard",
    label: "Keyboard shortcuts",
    icon: KeyboardIcon,
    settings: [
      {
        id: "searchShortcut",
        label: "Search shortcut",
        // description: "Keyboard shortcut to open search",
        type: "hotkey",
      },
      {
        id: "settingsShortcut",
        label: "Settings shortcut",
        description: "Clear to turn the shortcut off.",
        type: "hotkey",
        allowEmpty: true,
      },
      {
        id: "themeShortcut",
        label: "Light/dark shortcut",
        description:
          "Toggle light and dark on the new tab page. Clear to turn the shortcut off.",
        type: "hotkey",
        allowEmpty: true,
      },
      {
        id: "omniboxKeyword",
        label: "Omnibox keyword",
        description:
          "Type this in the address bar to search pinned links. To change it: right-click the address bar → Manage search engines → find PegBoard under Search engines.",
        type: "info",
        infoValue: "pb",
      },
    ],
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: PaintBrushIcon,
    settings: [
      {
        id: "theme",
        label: "Theme",
        description: "Light, dark, or match the system.",
        type: "theme",
      },
      {
        id: "sectionLabelSize",
        label: "Section label size",
        description: "Font size for section headers in canvas",
        type: "select",
        options: SECTION_LABEL_SIZE_OPTIONS,
      },
      {
        id: "canvasRememberScroll",
        label: "Remember canvas position",
        description:
          "Save where the canvas is positioned. New tabs restore that view.",
        type: "boolean",
      },
      {
        id: "canvasRestoreScrollOnResize",
        label: "Keep position on resize",
        description:
          "When the window is resized, keep the same canvas position, even if the window is larger than the items.",
        type: "boolean",
      },
    ],
  },
  {
    id: "sync",
    label: "Sync",
    icon: CloudArrowUpIcon,
    settings: [
      {
        id: "canvasScrollSync",
        label: "Sync canvas scroll",
        description:
          "Sync your last canvas position across signed in devices (uses chrome sync).",
        type: "boolean",
      },
    ],
  },
  {
    id: "data",
    label: "Data",
    icon: DatabaseIcon,
    Content: DataSectionContent,
  },
  {
    id: "support",
    label: "Support",
    icon: HeartIcon,
    Content: SupportSectionContent,
  },
]
