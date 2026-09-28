import { useState, useCallback, useEffect } from "react"
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
import { useTheme } from "@/components/theme-provider"
import type { Section, Link } from "@/types"
import { DotBackground } from "./components/canvas/DotGridBackground"
import { standaloneSpawnPosition } from "@/lib/standaloneSpawnPosition"
import { WhatsNewModal } from "@/components/WhatsNewModal"
import { WHATS_NEW_CONTENT } from "@/lib/whatsNewContent"
import {
  readWhatsNewSeenId,
  shouldShowWhatsNewChip,
  writeWhatsNewSeenId,
} from "@/lib/whatsNew"
import { OnboardingModal } from "@/components/OnboardingModal"
import { parseConfigTextAsync } from "@/lib/pegboardConfig"
import { FLAGS } from "@/lib/flags"
import { CroppedPageSetupDialog } from "@/components/cropped-page/CroppedPageSetupDialog"
import {
  CroppedPageCaptureOverlay,
  type CroppedPageCaptureSession,
} from "@/components/cropped-page/CroppedPageCaptureOverlay"
import { CroppedPageExpandOverlay } from "@/components/cropped-page/CroppedPageExpandOverlay"
import { CroppedPageMirror } from "@/components/cropped-page/CroppedPageMirror"
import { croppedPageSpawnPosition } from "@/lib/croppedPage"
import type { CroppedPage } from "@/types"

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
  const [canvasSectionEditId, setCanvasSectionEditId] = useState<string | null>(
    null
  )
  const [linkEditorOpen, setLinkEditorOpen] = useState(false)
  const [linkToEdit, setLinkToEdit] = useState<Link | null>(null)
  const [linkEditorScope, setLinkEditorScope] = useState<LinkEditorScope>(null)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [showWhatsNewChip, setShowWhatsNewChip] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [emptyImportError, setEmptyImportError] = useState<string | null>(null)
  const [croppedSetupOpen, setCroppedSetupOpen] = useState(false)
  const [captureSession, setCaptureSession] =
    useState<CroppedPageCaptureSession | null>(null)
  const [expandedCroppedPageId, setExpandedCroppedPageId] = useState<
    string | null
  >(null)
  const [expandOriginRect, setExpandOriginRect] = useState<DOMRect | null>(null)
  const [editOriginRect, setEditOriginRect] = useState<DOMRect | null>(null)

  const { setTheme, toggleLightDark } = useTheme()

  useEffect(() => {
    if (!loaded) return
    if (FLAGS.alwaysShowWhatsNew) {
      setShowWhatsNewChip(true)
      return
    }
    let cancelled = false
    void readWhatsNewSeenId().then((seenId) => {
      if (cancelled) return
      setShowWhatsNewChip(
        shouldShowWhatsNewChip(seenId, WHATS_NEW_CONTENT.id)
      )
    })
    return () => {
      cancelled = true
    }
  }, [loaded])

  const markWhatsNewSeen = useCallback(() => {
    if (FLAGS.alwaysShowWhatsNew) return
    setShowWhatsNewChip(false)
    void writeWhatsNewSeenId(WHATS_NEW_CONTENT.id)
  }, [])

  const handleWhatsNewOpenChange = useCallback(
    (open: boolean) => {
      setWhatsNewOpen(open)
      if (!open) markWhatsNewSeen()
    },
    [markWhatsNewSeen]
  )

  const searchShortcut = state.settings.searchShortcut
  const settingsShortcut = state.settings.settingsShortcut
  const themeShortcut = state.settings.themeShortcut
  useHotkey(
    searchShortcut as RegisterableHotkey,
    useCallback(() => setCommandOpen((prev) => !prev), []),
    { enabled: canvasSectionEditId == null }
  )
  useHotkey(
    settingsShortcut as RegisterableHotkey,
    useCallback(() => setSettingsOpen(true), []),
    { enabled: canvasSectionEditId == null }
  )
  useHotkey(
    (themeShortcut || "d") as RegisterableHotkey,
    toggleLightDark,
    { enabled: themeShortcut.length > 0 && canvasSectionEditId == null }
  )

  const handleEscape = useCallback(() => {
    if (whatsNewOpen) {
      setWhatsNewOpen(false)
      markWhatsNewSeen()
    } else if (onboardingOpen) {
      setOnboardingOpen(false)
    } else if (settingsOpen) {
      setSettingsOpen(false)
    } else if (commandOpen) {
      setCommandOpen(false)
    } else if (canvasSectionEditId) {
      setCanvasSectionEditId(null)
    } else if (sectionEditorOpen) {
      setSectionEditorOpen(false)
    } else if (linkEditorOpen) {
      setLinkEditorOpen(false)
    } else if (expandedCroppedPageId) {
      setExpandedCroppedPageId(null)
      setExpandOriginRect(null)
    } else if (captureSession) {
      setCaptureSession(null)
    } else if (croppedSetupOpen) {
      setCroppedSetupOpen(false)
    } else if (state.editMode) {
      save((prev) => ({ ...prev, editMode: false }))
    }
  }, [
    whatsNewOpen,
    onboardingOpen,
    markWhatsNewSeen,
    settingsOpen,
    commandOpen,
    canvasSectionEditId,
    sectionEditorOpen,
    linkEditorOpen,
    expandedCroppedPageId,
    captureSession,
    croppedSetupOpen,
    state.editMode,
    save,
  ])

  useEscape({ onEscape: handleEscape })

  const openAddSection = () => {
    setSectionToEdit(null)
    setSectionEditorOpen(true)
  }

  const openEditSection = useCallback(
    (section: Section) => {
      if (state.layoutMode === "canvas") {
        setCanvasSectionEditId(section.id)
        return
      }
      setSectionToEdit(section)
      setSectionEditorOpen(true)
    },
    [state.layoutMode]
  )

  const patchSection = useCallback(
    (
      sectionId: string,
      patch: Partial<Pick<Section, "name" | "accentColor">>
    ) => {
      save((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, ...patch } : s
        ),
      }))
    },
    [save]
  )

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

  const openCroppedPageSetup = useCallback(() => {
    setCroppedSetupOpen(true)
  }, [])

  const openCroppedPageCapture = useCallback(
    (pageId: string, originRect: DOMRect | null) => {
      const page = state.croppedPages.find((p) => p.id === pageId)
      if (!page) return
      setExpandedCroppedPageId(null)
      setExpandOriginRect(null)
      setEditOriginRect(originRect)
      setCaptureSession({
        pageId: page.id,
        url: page.url,
        label: page.label,
        accentColor: page.accentColor,
        existing: page,
      })
    },
    [state.croppedPages]
  )

  const handleCroppedPageContinue = useCallback(
    (url: string, accentColor: string, label: string) => {
      setCaptureSession({
        pageId: null,
        url,
        label,
        accentColor,
      })
    },
    []
  )

  const handleCroppedPageSave = useCallback(
    (page: CroppedPage) => {
      save((prev) => {
        const idx = prev.croppedPages.findIndex((p) => p.id === page.id)
        const position =
          idx >= 0
            ? prev.croppedPages[idx].position
            : croppedPageSpawnPosition(prev.croppedPages.length)
        const nextPage = { ...page, position }
        const croppedPages =
          idx >= 0
            ? prev.croppedPages.map((p, i) => (i === idx ? nextPage : p))
            : [...prev.croppedPages, nextPage]
        return { ...prev, croppedPages }
      })
      setCaptureSession(null)
    },
    [save]
  )

  const handleCroppedPageCaptureDelete = useCallback(() => {
    if (!captureSession?.pageId) {
      setCaptureSession(null)
      return
    }
    const id = captureSession.pageId
    save((prev) => ({
      ...prev,
      croppedPages: prev.croppedPages.filter((p) => p.id !== id),
    }))
    setCaptureSession(null)
  }, [captureSession, save])

  const handleExpandCroppedPage = useCallback(
    (pageId: string, originRect: DOMRect) => {
      setExpandOriginRect(originRect)
      setExpandedCroppedPageId(pageId)
    },
    []
  )

  const handleEmptyImport = useCallback(
    async (file: File) => {
      setEmptyImportError(null)
      const confirmed = window.confirm(
        "Import replaces all sections, ungrouped links, layout mode, and settings with the file contents. Continue?"
      )
      if (!confirmed) return
      try {
        const text = await file.text()
        const result = await parseConfigTextAsync(text)
        if (!result.ok) {
          setEmptyImportError(result.error)
          return
        }
        save({ ...result.appState, editMode: false })
        if (result.theme) {
          setTheme(result.theme)
        }
      } catch {
        setEmptyImportError("Could not read the file.")
      }
    },
    [save, setTheme]
  )

  if (!loaded) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const isEmpty =
    state.sections.length === 0 &&
    state.standaloneLinks.length === 0 &&
    (state.croppedPages?.length ?? 0) === 0

  const expandedCroppedPage = expandedCroppedPageId
    ? state.croppedPages.find((p) => p.id === expandedCroppedPageId)
    : undefined

  return (
    <>
      {isEmpty ? (
        <>
          {state.layoutMode === "canvas" ? (
            <DotBackground className="fixed inset-0 bg-background" />
          ) : null}
          <EmptyState
            onCreateSection={openAddSection}
            onAddShortcut={openAddStandaloneLink}
            onImportBackup={handleEmptyImport}
            importError={emptyImportError}
            onOpenTour={() => setOnboardingOpen(true)}
          />
        </>
      ) : (
        <div key={state.layoutMode} className="layout-transition fixed inset-0">
          {state.layoutMode === "canvas" ? (
            <>
              <DotBackground className="bg-background" />
              <Canvas
                state={state}
                save={save}
                onEditSection={openEditSection}
                editingSectionId={canvasSectionEditId}
                onSectionNameChange={(sectionId, name) =>
                  patchSection(sectionId, { name })
                }
                onSectionAccentChange={(sectionId, accentColor) =>
                  patchSection(sectionId, { accentColor })
                }
                onExitSectionEdit={() => setCanvasSectionEditId(null)}
                onEditLink={openEditLink}
                onAddLink={openAddLink}
                onEditStandaloneLink={openEditStandaloneLink}
                onEditCroppedPage={openCroppedPageCapture}
                onExpandCroppedPage={handleExpandCroppedPage}
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
        onAddCroppedPage={openCroppedPageSetup}
        searchOpen={commandOpen}
        onSearchClick={() => setCommandOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
        hideSearch={isEmpty}
        showWhatsNew={showWhatsNewChip && !isEmpty}
        onWhatsNewClick={() => setWhatsNewOpen(true)}
        onDismissWhatsNew={markWhatsNewSeen}
        suspended={canvasSectionEditId != null}
      />
      <OnboardingModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        searchShortcut={searchShortcut}
      />
      <WhatsNewModal
        open={whatsNewOpen}
        onOpenChange={handleWhatsNewOpenChange}
        content={WHATS_NEW_CONTENT}
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
      <CroppedPageSetupDialog
        open={croppedSetupOpen}
        onOpenChange={setCroppedSetupOpen}
        onContinue={handleCroppedPageContinue}
      />
      {state.croppedPages.map((page) => (
        <CroppedPageMirror
          key={page.id}
          page={page}
          dimmed={canvasSectionEditId != null}
        />
      ))}
      {captureSession ? (
        <CroppedPageCaptureOverlay
          session={captureSession}
          originRect={editOriginRect}
          onSave={handleCroppedPageSave}
          onDelete={
            captureSession.pageId ? handleCroppedPageCaptureDelete : undefined
          }
          onCancel={() => setCaptureSession(null)}
        />
      ) : null}
      {expandedCroppedPage ? (
        <CroppedPageExpandOverlay
          page={expandedCroppedPage}
          originRect={expandOriginRect}
          onClose={() => {
            setExpandedCroppedPageId(null)
            setExpandOriginRect(null)
          }}
          onEdit={(rect) => openCroppedPageCapture(expandedCroppedPage.id, rect)}
        />
      ) : null}
    </>
  )
}

export default App
