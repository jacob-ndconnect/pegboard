import { useCallback, useMemo } from "react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { getDomain } from "@/lib/url"
import type { Link, Section, StandaloneLinkEntry } from "@/types"

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: Section[]
  standaloneLinks: StandaloneLinkEntry[]
}

function openLink(url: string) {
  window.location.href = url
}

export function CommandPalette({
  open,
  onOpenChange,
  sections,
  standaloneLinks,
}: CommandPaletteProps) {
  const linkById = useMemo(() => {
    const map = new Map<string, Link>()
    for (const section of sections) {
      for (const link of section.links) {
        map.set(`${section.id}-${link.id}`, link)
      }
    }
    for (const { link } of standaloneLinks) {
      map.set(`standalone-${link.id}`, link)
    }
    return map
  }, [sections, standaloneLinks])

  const handleSelect = useCallback(
    (value: string) => {
      const link = linkById.get(value)
      if (link) {
        openLink(link.url)
        onOpenChange(false)
      }
    },
    [linkById, onOpenChange]
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search links"
      className="rounded-2xl"
    >
      <Command>
        <CommandInput
          className="my-2 text-base"
          placeholder="Search by name or domain..."
        />
        <CommandList>
          <CommandEmpty>No links found.</CommandEmpty>
          {standaloneLinks.length > 0 && (
            <CommandGroup key="ungrouped" heading="Ungrouped">
              {standaloneLinks.map(({ link }) => {
                const domain = getDomain(link.url)
                const keywords: string[] = [
                  link.label,
                  domain,
                  ...(link.searchTerms ? [link.searchTerms] : []),
                ]

                return (
                  <CommandItem
                    key={link.id}
                    value={`standalone-${link.id}`}
                    keywords={keywords}
                    onSelect={handleSelect}
                    className="cursor-pointer rounded-full px-2 py-1.5 text-base text-muted-foreground data-[selected=true]:bg-foreground/20 data-[selected=true]:text-foreground"
                  >
                    {link.badge?.emoji && (
                      <span className="shrink-0" aria-hidden>
                        {link.badge.emoji}
                      </span>
                    )}
                    <span className="truncate">
                      {link.searchTerms ?? link.label}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}
          {sections.map((section) => (
            <CommandGroup key={section.id} heading={section.name}>
              {section.links.map((link) => {
                const domain = getDomain(link.url)
                const keywords: string[] = [
                  link.label,
                  domain,
                  ...(link.searchTerms ? [link.searchTerms] : []),
                ]

                return (
                  <CommandItem
                    key={link.id}
                    value={`${section.id}-${link.id}`}
                    keywords={keywords}
                    onSelect={handleSelect}
                    className="cursor-pointer rounded-full px-2 py-1.5 text-base text-muted-foreground data-[selected=true]:bg-foreground/20 data-[selected=true]:text-foreground"
                  >
                    {link.badge?.emoji && (
                      <span className="shrink-0" aria-hidden>
                        {link.badge.emoji}
                      </span>
                    )}
                    <span className="truncate">
                      {link.searchTerms ?? link.label}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
