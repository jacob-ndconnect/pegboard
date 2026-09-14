import { useState } from "react"
import { PencilSimpleIcon } from "@phosphor-icons/react"
import { getFaviconFallbackUrl, getFaviconUrl } from "@/lib/favicon"
import { cn } from "@/lib/utils"
import type { Link, Section } from "@/types"
import { getContrastColor } from "@/lib/color"

type LinkCardProps = {
  link: Link
  editMode: boolean
  /** Canvas drag state — keeps `cursor-grabbing` for the whole drag (not only `:active`). */
  isDragging?: boolean
  onEdit?: () => void
  accentColor?: Section["accentColor"]
}

function getPlaceholderColor(label: string): string {
  const hue = label.charCodeAt(0) % 360
  return `hsl(${hue}, 65%, 55%)`
}

export function LinkCard({
  link,
  editMode,
  isDragging = false,
  onEdit,
  accentColor,
}: LinkCardProps) {
  const [faviconError, setFaviconError] = useState(false)
  const [useFallback, setUseFallback] = useState(false)
  const [prevUrl, setPrevUrl] = useState(link.url)
  if (prevUrl !== link.url) {
    setPrevUrl(link.url)
    setFaviconError(false)
    setUseFallback(false)
  }
  const faviconUrl = getFaviconUrl(link.url)
  const fallbackUrl = getFaviconFallbackUrl(link.url)
  const currentSrc = useFallback ? fallbackUrl : faviconUrl
  const showPlaceholder = faviconError || !currentSrc
  const placeholderColor = getPlaceholderColor(link.label)
  const firstLetter = link.label.charAt(0).toUpperCase() || "?"

  const handleFaviconError = () => {
    if (!useFallback && fallbackUrl) {
      setUseFallback(true)
    } else {
      setFaviconError(true)
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (editMode && onEdit) {
      e.preventDefault()
      onEdit()
    }
  }

  const accentColorToUse = accentColor || "#ffffff55"

  const sectionAccentActionStyle = {
    "--section-accent": accentColorToUse,
    "--section-accent-contrast": getContrastColor(accentColorToUse),
  } as React.CSSProperties

  return (
    <div
      className={cn(
        "group/link-card relative flex w-[100px] flex-col items-center rounded-none p-2 pt-3",
        editMode && "border border-border pt-2"
      )}
      style={{ borderColor: accentColorToUse }}
    >
      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onEdit()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          style={sectionAccentActionStyle}
          className={cn(
            "group/icon-action absolute top-0 right-0 z-20 cursor-pointer rounded-none bg-transparent p-1 text-muted-foreground transition-[opacity,background-color,color] duration-150 hover:bg-(--section-accent) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
            "opacity-50 group-hover/link-card:opacity-100",
            !editMode &&
              "top-0 right-0 opacity-0 group-hover/link-card:opacity-100"
          )}
          aria-label="Edit link"
        >
          <PencilSimpleIcon
            className="size-5 text-(--section-accent) transition-colors group-hover/icon-action:text-(--section-accent-contrast)"
            weight="bold"
          />
        </button>
      )}
      <a
        href={link.url}
        rel="noopener noreferrer"
        draggable={editMode ? false : undefined}
        onClick={handleClick}
        onDragStart={editMode ? (e) => e.preventDefault() : undefined}
        className={cn(
          "flex w-full flex-col items-center gap-2 p-0 text-inherit no-underline transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          editMode
            ? isDragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : "cursor-pointer"
        )}
      >
        {editMode && (
          <div
            className="pointer-events-none relative -mt-3 flex min-h-[22px] w-full shrink-0 flex-col items-center justify-center gap-0.5 py-1"
            aria-hidden
          >
            {[1, 2].map((i) => (
              <span
                key={i}
                className="h-[2px] w-5 shrink-0 rounded-full opacity-0 transition-opacity duration-150 group-hover/link-card:opacity-100"
                style={{ backgroundColor: accentColorToUse }}
              />
            ))}
          </div>
        )}
        <div className="relative shrink-0">
          <div
            className={cn(
              "flex size-16 items-center justify-center overflow-hidden rounded-full",
              showPlaceholder && "text-white"
            )}
            style={
              showPlaceholder
                ? { backgroundColor: placeholderColor }
                : undefined
            }
          >
            {showPlaceholder ? (
              <span className="text-2xl font-semibold">{firstLetter}</span>
            ) : (
              <img
                src={currentSrc}
                alt=""
                draggable={editMode ? false : undefined}
                className={cn(
                  "size-full object-cover",
                  link.invertIcon && "dark:invert"
                )}
                onError={handleFaviconError}
              />
            )}
          </div>

          {link.badge && (
            <span
              className="absolute -right-1 -bottom-1 flex size-[22px] items-center justify-center rounded-full text-xs ring-2 ring-background"
              style={{ backgroundColor: link.badge.color }}
              aria-hidden
            >
              {link.badge.emoji}
            </span>
          )}
        </div>

        <span className="max-w-[80px] truncate text-center text-xs text-muted-foreground">
          {link.label}
        </span>
      </a>
    </div>
  )
}
