import { useState, useCallback } from "react"
import { Canvas } from "@/components/canvas/Canvas"
import { ListView } from "@/components/list/ListView"
import { FolderView } from "@/components/folder/FolderView"
import { EmptyState } from "@/components/EmptyState"
import { CommandPalette } from "@/components/search/CommandPalette"
import { EditModeToolbar } from "@/components/editor/EditModeToolbar"
import { SectionEditor } from "@/components/editor/SectionEditor"
import { LinkEditor } from "@/components/editor/LinkEditor"
import { SettingsModal } from "@/components/settings/SettingsModal"
import { useStorage } from "@/hooks/useStorage"
import { useHotkey, type RegisterableHotkey } from "@tanstack/react-hotkeys"
import { useEscape } from "@/hooks/useEscape"
import type { Section, Link } from "@/types"
import { DotBackground } from "./components/canvas/DotGridBackground"
import { standaloneSpawnPosition } from "@/lib/standaloneSpawnPosition"

type LinkEditorScope =
  | { kind: "section"; sectionId: string }
  | { kind: "standalone" }
  | null

export function App() {
  const { state, save, loaded } = useStorage()
  const [commandOpen, setCommandOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sectionEditorOpen, setSectionEditorOpen] = useState(false)
  const [sectionToEdit, setSectionToEdit] = useState<Section | null>(null)
  const [linkEditorOpen, setLinkEditorOpen] = useState(false)
  const [linkToEdit, setLinkToEdit] = useState<Link | null>(null)
  const [linkEditorScope, setLinkEditorScope] = useState<LinkEditorScope>(null)

  const searchShortcut = state.settings.searchShortcut
  const settingsShortcut = state.settings.settingsShortcut
  useHotkey(
    searchShortcut as RegisterableHotkey,
    useCallback(() => setCommandOpen((prev) => !prev), [])
  )
  useHotkey(
    settingsShortcut as RegisterableHotkey,
    useCallback(() => setSettingsOpen(true), [])
  )

  const handleEscape = useCallback(() => {
    if (settingsOpen) {
      setSettingsOpen(false)
    } else if (commandOpen) {
      setCommandOpen(false)
    } else if (sectionEditorOpen) {
      setSectionEditorOpen(false)
    } else if (linkEditorOpen) {
      setLinkEditorOpen(false)
    } else if (state.editMode) {
      save((prev) => ({ ...prev, editMode: false }))
    }
  }, [
    settingsOpen,
    commandOpen,
    sectionEditorOpen,
    linkEditorOpen,
    state.editMode,
    state,
    save,
  ])

  useEscape({ onEscape: handleEscape })

  const openAddSection = () => {
    setSectionToEdit(null)
    setSectionEditorOpen(true)
  }

  const openEditSection = useCallback((section: Section) => {
    setSectionToEdit(section)
    setSectionEditorOpen(true)
  }, [])

  const openEditLink = useCallback(
    (sectionId: string, linkId: string) => {
      const section = state.sections.find((s) => s.id === sectionId)
      const link = section?.links.find((l) => l.id === linkId) ?? null
      setLinkToEdit(link)
      setLinkEditorScope({ kind: "section", sectionId })
      setLinkEditorOpen(true)
    },
    [state.sections]
  )

  const openAddLink = useCallback((sectionId: string) => {
    setLinkToEdit(null)
    setLinkEditorScope({ kind: "section", sectionId })
    setLinkEditorOpen(true)
  }, [])

  const openAddStandaloneLink = useCallback(() => {
    setLinkToEdit(null)
    setLinkEditorScope({ kind: "standalone" })
    setLinkEditorOpen(true)
  }, [])

  const openEditStandaloneLink = useCallback(
    (linkId: string) => {
      const entry = state.standaloneLinks.find((e) => e.link.id === linkId)
      setLinkToEdit(entry?.link ?? null)
      setLinkEditorScope({ kind: "standalone" })
      setLinkEditorOpen(true)
    },
    [state.standaloneLinks]
  )

  const handleSectionSave = useCallback(
    (section: Section) => {
      save((prev) => {
        const exists = prev.sections.some((s) => s.id === section.id)
        const newSections = exists
          ? prev.sections.map((s) => (s.id === section.id ? section : s))
          : [...prev.sections, section]
        return { ...prev, sections: newSections }
      })
    },
    [save]
  )

  const handleSectionDelete = useCallback(
    (sectionId: string) => {
      save((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
      }))
    },
    [save]
  )

  const handleLinkSave = useCallback(
    (link: Link) => {
      if (!linkEditorScope) return
      if (linkEditorScope.kind === "standalone") {
        save((prev) => {
          const idx = prev.standaloneLinks.findIndex((e) => e.link.id === link.id)
          if (idx >= 0) {
            const next = [...prev.standaloneLinks]
            next[idx] = { ...next[idx], link }
            return { ...prev, standaloneLinks: next }
          }
          const n = prev.standaloneLinks.length
          const position = standaloneSpawnPosition(n)
          return {
            ...prev,
            standaloneLinks: [...prev.standaloneLinks, { link, position }],
          }
        })
        return
      }
      const sectionId = linkEditorScope.sectionId
      save((prev) => {
        const newSections = prev.sections.map((s) => {
          if (s.id !== sectionId) return s
          const exists = s.links.some((l) => l.id === link.id)
          const newLinks = exists
            ? s.links.map((l) => (l.id === link.id ? link : l))
            : [...s.links, link]
          return { ...s, links: newLinks }
        })
        return { ...prev, sections: newSections }
      })
    },
    [save, linkEditorScope]
  )

  const handleLinkDelete = useCallback(
    (linkId: string) => {
      if (!linkEditorScope) return
      if (linkEditorScope.kind === "standalone") {
        save((prev) => ({
          ...prev,
          standaloneLinks: prev.standaloneLinks.filter((e) => e.link.id !== linkId),
        }))
        return
      }
      const sectionId = linkEditorScope.sectionId
      save((prev) => {
        const newSections = prev.sections.map((s) => {
          if (s.id !== sectionId) return s
          return { ...s, links: s.links.filter((l) => l.id !== linkId) }
        })
        return { ...prev, sections: newSections }
      })
    },
    [save, linkEditorScope]
  )

  if (!loaded) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const isEmpty =
    state.sections.length === 0 && state.standaloneLinks.length === 0

  return (
    <>
      {isEmpty ? (
        <EmptyState
          onEditClick={() => save((prev) => ({ ...prev, editMode: true }))}
        />
      ) : (
        <div key={state.layoutMode} className="layout-transition fixed inset-0">
          {state.layoutMode === "canvas" ? (
            <>
              <DotBackground className="bg-background" />
              <Canvas
                state={state}
                save={save}
                onEditSection={openEditSection}
                onEditLink={openEditLink}
                onAddLink={openAddLink}
                onEditStandaloneLink={openEditStandaloneLink}
              />
            </>
          ) : state.layoutMode === "list" ? (
            <ListView
              sections={state.sections}
              standaloneLinks={state.standaloneLinks}
              editMode={state.editMode}
              save={save}
              onEditSection={openEditSection}
              onEditLink={openEditLink}
              onAddLink={openAddLink}
              onEditStandaloneLink={openEditStandaloneLink}
              onAddStandaloneLink={openAddStandaloneLink}
            />
          ) : (
            <FolderView
              sections={state.sections}
              standaloneLinks={state.standaloneLinks}
              editMode={state.editMode}
              save={save}
              onEditSection={openEditSection}
              onEditLink={openEditLink}
              onAddLink={openAddLink}
              onEditStandaloneLink={openEditStandaloneLink}
              onAddStandaloneLink={openAddStandaloneLink}
            />
          )}
        </div>
      )}
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        sections={state.sections}
        standaloneLinks={state.standaloneLinks}
      />
      <EditModeToolbar
        state={state}
        save={save}
        onAddSection={openAddSection}
        onAddStandaloneLink={openAddStandaloneLink}
        searchOpen={commandOpen}
        onSearchClick={() => setCommandOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        state={state}
        settings={state.settings}
        onSave={(settings) => save((prev) => ({ ...prev, settings }))}
        onReplaceState={(next) => save({ ...next, editMode: false })}
      />
      <SectionEditor
        open={sectionEditorOpen}
        onOpenChange={setSectionEditorOpen}
        section={sectionToEdit}
        onSave={handleSectionSave}
        onDelete={sectionToEdit ? handleSectionDelete : undefined}
      />
      <LinkEditor
        key={linkEditorOpen ? (linkToEdit?.id ?? "new") : "closed"}
        open={linkEditorOpen}
        onOpenChange={setLinkEditorOpen}
        link={linkToEdit}
        onSave={handleLinkSave}
        onDelete={linkToEdit ? handleLinkDelete : undefined}
      />
    </>
  )
}

export default App
