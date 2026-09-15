import {
  FoldersIcon,
  PencilIcon,
  SquaresFourIcon,
  ListIcon,
} from "@phosphor-icons/react"
import type { Icon as PhosphorIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabItem } from "@/components/ui/tabs-proximity"
import type { IconComponent } from "@/lib/icon-context"
import { cn } from "@/lib/utils"
import type { AppState } from "@/types"
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group"
import {
  ArrowClockwiseIcon,
  FloppyDiskIcon,
  GearIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  SelectionPlusIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr"
import { formatForDisplay } from "@tanstack/react-hotkeys"
import { Kbd } from "../ui/kbd"
import GradualBlurMemo from "../GradualBlur"
import { getDefaultCanvasSectionPosition } from "@/lib/canvasGrid"

function hasCustomLayout(sections: AppState["sections"]): boolean {
  const tolerance = 2
  return sections.some((section, index) => {
    const def = getDefaultCanvasSectionPosition(index)
    const pos = section.position
    return (
      Math.abs(pos.x - def.x) > tolerance || Math.abs(pos.y - def.y) > tolerance
    )
  })
}

function resetSectionPositions(sections: AppState["sections"]) {
  return sections.map((section, index) => ({
    ...section,
    position: getDefaultCanvasSectionPosition(index),
  }))
}

function phosphorTabIcon(Icon: PhosphorIcon): IconComponent {
  return function PhosphorTabIcon({ size = 16, strokeWidth, className }) {
    const weight = (strokeWidth ?? 1.5) >= 1.75 ? "regular" : "light"
    return <Icon size={size} weight={weight} className={className} />
  }
}

type EditModeToolbarProps = {
  state: AppState
  save: (newStateOrUpdater: AppState | ((prev: AppState) => AppState)) => void
  onAddSection: () => void
  onAddStandaloneLink: () => void
  searchOpen: boolean
  onSearchClick: () => void
  onSettingsClick: () => void
  hideSearch?: boolean
  showWhatsNew?: boolean
  onWhatsNewClick?: () => void
  onDismissWhatsNew?: () => void
}

export function EditModeToolbar({
  state,
  save,
  onAddSection,
  onAddStandaloneLink,
  searchOpen,
  onSearchClick,
  onSettingsClick,
  hideSearch = false,
  showWhatsNew = false,
  onWhatsNewClick,
  onDismissWhatsNew,
}: EditModeToolbarProps) {
  const { editMode, layoutMode } = state
  const isBoardEmpty =
    state.sections.length === 0 && state.standaloneLinks.length === 0

  const toggleEditMode = () => {
    save({ ...state, editMode: !editMode })
  }

  const setLayoutMode = (mode: AppState["layoutMode"]) => {
    save({ ...state, layoutMode: mode })
  }

  return (
    <>
      <GradualBlurMemo
        className="top-0 right-0 left-0"
        position="top"
        strength={0.5}
        height="4rem"
        divCount={5}
        zIndex={0}
        style={{ right: "calc(100vw - 100%)" }}
      />
      <div
        className="fixed top-4 right-4 left-4 z-40 grid grid-cols-[1fr_auto_1fr] items-center justify-between gap-1"
        aria-label="Edit mode toolbar"
      >
        <div className="flex justify-start">
          <Tabs
            value={layoutMode}
            onValueChange={(v) => setLayoutMode(v as AppState["layoutMode"])}
            className="rounded-none border border-border bg-background/95 shadow-sm backdrop-blur"
            shape="squared"
          >
            <TabsList className="rounded-none border-0 bg-transparent p-1 shadow-none">
              <TabItem
                value="canvas"
                icon={phosphorTabIcon(SquaresFourIcon)}
                className="rounded-none py-1"
              />
              <TabItem
                value="list"
                icon={phosphorTabIcon(ListIcon)}
                className="rounded-none py-1"
              />
              <TabItem
                value="folders"
                icon={phosphorTabIcon(FoldersIcon)}
                className="rounded-none py-1"
              />
            </TabsList>
          </Tabs>
        </div>

        {hideSearch ? (
          <div aria-hidden className="w-full max-w-sm" />
        ) : (
          <div className="relative w-full max-w-sm">
            <InputGroup
              className={cn(
                "f-full w-full cursor-pointer rounded-none",
                searchOpen && "opacity-2"
              )}
              onClick={onSearchClick}
            >
              <InputGroupInput placeholder="Search" />
              <InputGroupAddon>
                <MagnifyingGlassIcon className="size-4" />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                {formatForDisplay(state.settings.searchShortcut)
                  .split("+")
                  .map((part) => (
                    <Kbd
                      key={part}
                      className="rounded-lg bg-muted text-muted-foreground"
                    >
                      {part}
                    </Kbd>
                  ))}
              </InputGroupAddon>
            </InputGroup>
            {showWhatsNew && onWhatsNewClick && onDismissWhatsNew ? (
              <div
                role="status"
                className="absolute top-full left-1/2 z-50 mt-1.5 flex w-max max-w-[13rem] -translate-x-1/2 items-center gap-1 border border-border bg-background/95 px-2 py-1 text-xs shadow-sm backdrop-blur"
              >
                <button
                  type="button"
                  onClick={onWhatsNewClick}
                  className="min-w-0 cursor-pointer truncate text-left text-foreground hover:underline"
                >
                  See what&apos;s new
                </button>
                <button
                  type="button"
                  aria-label="Dismiss what's new"
                  className="cursor-pointer shrink-0 rounded-none p-0.5 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDismissWhatsNew()
                  }}
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex justify-end">
          <div className="flex items-center gap-1">
            <Button
              variant={editMode ? "outline" : "ghost"}
              size={editMode ? "sm" : "icon-sm"}
              onClick={toggleEditMode}
              className={cn(
                "cursor-pointer rounded-none",
                editMode && "gap-1.5 bg-muted"
              )}
              aria-label={editMode ? "Save changes" : "Edit mode"}
              aria-pressed={editMode}
            >
              {editMode ? (
                <FloppyDiskIcon className="size-4" />
              ) : (
                <PencilIcon className="size-4" />
              )}
              {editMode && <span className="hidden sm:inline">Save</span>}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSettingsClick}
              className="cursor-pointer rounded-none"
              aria-label="Open settings"
            >
              <GearIcon className="size-4" weight="regular" />
            </Button>
          </div>
        </div>
      </div>

      {editMode && !isBoardEmpty && (
        <>
          <GradualBlurMemo
            className="right-0 bottom-0 left-0"
            position="bottom"
            target="page"
            strength={0.5}
            height="4rem"
            divCount={5}
            zIndex={0}
            style={{ right: "calc(100vw - 100%)" }}
          />
          <div
            className="fixed right-4 bottom-4 left-4 z-[110] flex justify-center"
            aria-label="Edit actions toolbar"
          >
            <div className="flex items-center border border-border bg-background/95 p-1 shadow-sm backdrop-blur">
              <Button
                variant="secondary"
                size="lg"
                onClick={onAddSection}
                className="m-1 cursor-pointer gap-1.5 rounded-full"
                aria-label={
                  layoutMode === "folders" ? "Add folder" : "Add section"
                }
              >
                <SelectionPlusIcon className="size-4" />
                <span className="hidden sm:inline">
                  {layoutMode === "folders" ? "Add folder" : "Add section"}
                </span>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={onAddStandaloneLink}
                className="m-1 cursor-pointer gap-1.5 rounded-full border-l border-border"
                aria-label="Add link"
              >
                <LinkSimpleIcon className="size-4" />
                <span className="hidden sm:inline">Add link</span>
              </Button>
              {layoutMode === "canvas" &&
                state.sections.length > 0 &&
                hasCustomLayout(state.sections) && (
                  <>
                    {/* <div className="h-5 w-px bg-border" aria-hidden /> */}
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() =>
                        save((prev) => ({
                          ...prev,
                          sections: resetSectionPositions(prev.sections),
                        }))
                      }
                      className="cursor-pointer rounded-l-none text-xs text-muted-foreground"
                      title="Reset section positions to grid"
                    >
                      <ArrowClockwiseIcon className="size-4" />
                      Reset positions
                    </Button>
                  </>
                )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
