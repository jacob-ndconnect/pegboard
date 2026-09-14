import type { AppState } from "@/types"
import { CoffeeIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { SUPPORT_CONFIG } from "./settingsConfig"

type SupportSectionContentProps = {
  state: AppState
  onReplaceState: (state: AppState) => void
}

export function SupportSectionContent(_props: SupportSectionContentProps) {
  const config = SUPPORT_CONFIG
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <img
          src={config.avatar}
          alt="Developer"
          className="size-20 shrink-0 rounded-full object-cover ring-2 ring-border"
        />
        <div className="flex flex-1 flex-col gap-3 text-center sm:text-left">
          <p className="text-xs text-muted-foreground">
            If you find this helpful, you should consider supporting me!
          </p>
          <Button
            variant="default"
            size="default"
            className="w-fit cursor-pointer rounded-full"
            asChild
          >
            <a
              href={config.buyMeACoffee}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <CoffeeIcon className="size-4" weight="fill" />
              Buy me a coffee
            </a>
          </Button>
        </div>
      </div>
      {config.links.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            More from me
          </p>
          <ul className="flex flex-wrap gap-2">
            {config.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
