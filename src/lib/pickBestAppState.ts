import type { AppState } from "@/types"
import { DEFAULT_APP_STATE } from "@/lib/defaultAppState"
import { preferIncoming } from "@/lib/appStateRevision"

/** Last-write-wins merge across live and stored copies (toggle migration). */
export function pickBestAppState(
  candidates: (AppState | undefined)[]
): AppState {
  let best: AppState = DEFAULT_APP_STATE
  for (const candidate of candidates) {
    if (!candidate) continue
    if (preferIncoming(candidate, best, "ready")) {
      best = candidate
    }
  }
  return best
}