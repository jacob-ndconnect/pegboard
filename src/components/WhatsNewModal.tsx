import Markdown from "react-markdown"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { WhatsNewContent } from "@/lib/whatsNew"
import { cn } from "@/lib/utils"

type WhatsNewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: WhatsNewContent
}

export function WhatsNewModal({
  open,
  onOpenChange,
  content,
}: WhatsNewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>{content.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[min(70dvh,calc(90dvh-8rem))]">
          <div
            className={cn(
              "text-sm text-muted-foreground",
              "[&_h2]:mt-4 [&_h2]:font-medium [&_h2]:text-foreground [&_h2:first-child]:mt-0",
              "[&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5",
              "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2"
            )}
          >
            <Markdown>{content.bodyMarkdown}</Markdown>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
