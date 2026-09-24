import { useEffect, useState } from "react"
import { enableIframeEmbedHeaders } from "@/lib/iframeEmbedHeaders"
import { cn } from "@/lib/utils"

type CroppedPageIframeProps = {
  url: string
  className?: string
  title?: string
  interactive?: boolean
}

export function CroppedPageIframe({
  url,
  className,
  title = "Pinned page",
  interactive = false,
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

  return (
    <iframe
      src={src}
      title={title}
      className={cn("size-full border-0 bg-background", className)}
      sandbox={
        interactive
          ? "allow-scripts allow-same-origin allow-forms allow-popups"
          : "allow-scripts allow-same-origin"
      }
    />
  )
}
