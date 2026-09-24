import { useState } from "react"
import { getContrastColor } from "@/lib/color"
import { getFaviconFallbackUrl, getFaviconUrl } from "@/lib/favicon"
import { cn } from "@/lib/utils"
import type { SectionLabelSize } from "@/types"
import {
  ArrowsInSimpleIcon,
  ArrowsOutSimpleIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react/dist/ssr"

type CroppedPageHeaderProps = {
  url: string
  label: string
  accentColor: string
  labelSize?: SectionLabelSize
  /** Match section actions: hidden until hover unless edit mode. */
  revealActionsOnHover?: boolean
  /** Canvas, outside edit mode: the label block is a real link. */
  labelIsLink?: boolean
  editMode?: boolean
  onEdit?: () => void
  onExpand?: () => void
  onCollapse?: () => void
}

export function CroppedPageHeader({
  url,
  label,
  accentColor,
  labelSize = "text-lg",
  revealActionsOnHover = false,
  labelIsLink = false,
  editMode = false,
  onEdit,
  onExpand,
  onCollapse,
}: CroppedPageHeaderProps) {
  const [faviconError, setFaviconError] = useState(false)
  const faviconSrc = faviconError ? getFaviconFallbackUrl(url) : getFaviconUrl(url)
  const actionStyle = {
    "--section-accent": accentColor,
    "--section-accent-contrast": getContrastColor(accentColor),
  } as React.CSSProperties
  const hideUntilHover =
    revealActionsOnHover && !editMode
      ? "opacity-0 transition-opacity group-hover:opacity-100"
      : undefined

  const labelClass = cn(
    "flex max-w-full min-w-0 items-center gap-1.5 truncate px-2 py-1 font-geist-pixel",
    labelSize,
    labelIsLink && "cursor-pointer no-underline"
  )
  const labelStyle = {
    backgroundColor: accentColor,
    color: getContrastColor(accentColor),
    fontVariationSettings: "var(--geist-pixel-variation-settings, normal)",
    fontFeatureSettings: "var(--geist-pixel-feature-settings, normal)",
  }
  const labelContent = (
    <>
      {faviconSrc ? (
        <img
          src={faviconSrc}
          alt=""
          className="size-4 shrink-0"
          onError={() => setFaviconError(true)}
        />
      ) : null}
      <span className="truncate">{label}</span>
    </>
  )

  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      {labelIsLink ? (
        <a
          href={url}
          rel="noopener noreferrer"
          className={labelClass}
          style={labelStyle}
        >
          {labelContent}
        </a>
      ) : (
        <h3 className={labelClass} style={labelStyle}>
          {labelContent}
        </h3>
      )}
      <div className="flex shrink-0 items-center gap-0.5">
        {onEdit ? (
          <button
            type="button"
            style={actionStyle}
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "group/icon-action cursor-pointer rounded-none p-1.5 transition-colors hover:bg-[var(--section-accent)]",
              hideUntilHover
            )}
            aria-label="Edit cutout"
          >
            <PencilSimpleIcon
              className="size-5 text-[var(--section-accent)] transition-colors group-hover/icon-action:text-[var(--section-accent-contrast)]"
              aria-hidden
            />
          </button>
        ) : null}
        {onExpand ? (
          <button
            type="button"
            style={actionStyle}
            onClick={(e) => {
              e.stopPropagation()
              onExpand()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "group/icon-action cursor-pointer rounded-none p-1.5 transition-colors hover:bg-[var(--section-accent)]",
              hideUntilHover
            )}
            aria-label="Expand"
          >
            <ArrowsOutSimpleIcon
              className="size-5 text-[var(--section-accent)] transition-colors group-hover/icon-action:text-[var(--section-accent-contrast)]"
              aria-hidden
            />
          </button>
        ) : null}
        {onCollapse ? (
          <button
            type="button"
            style={actionStyle}
            onClick={(e) => {
              e.stopPropagation()
              onCollapse()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="group/icon-action cursor-pointer rounded-none p-1.5 transition-colors hover:bg-[var(--section-accent)]"
            aria-label="Close"
          >
            <ArrowsInSimpleIcon
              className="size-5 text-[var(--section-accent)] transition-colors group-hover/icon-action:text-[var(--section-accent-contrast)]"
              aria-hidden
            />
          </button>
        ) : null}
      </div>
    </div>
  )
}
