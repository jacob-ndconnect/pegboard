import { useEffect, useState } from "react"
import { enableIframeEmbedHeaders } from "@/lib/iframeEmbedHeaders"
import { cn } from "@/lib/utils"

type CroppedPageIframeProps = {
  url: string
  className?: string
  title?: string
  interactive?: boolean
  /** Saved frame. Set before src so the first layout viewport is this size. */
  width?: number
  height?: number
}

export function CroppedPageIframe({
  url,
  className,
  title = "Pinned page",
  interactive = false,
  width,
  height,
}: CroppedPageIframeProps) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setSrc(null)
    void enableIframeEmbedHeaders().finally(() => {
      if (!cancelled) setSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  if (!src) return null

  const sized = width != null && height != null

  return (
    <iframe
      src={src}
      title={title}
      width={sized ? width : undefined}
      height={sized ? height : undefined}
      style={sized ? { width, height } : undefined}
      className={cn(
        "border-0 bg-background",
        sized ? "absolute top-0 left-0" : "size-full",
        className
      )}
      sandbox={
        interactive
          ? "allow-scripts allow-same-origin allow-forms allow-popups"
          : "allow-scripts allow-same-origin"
      }
    />
  )
}
