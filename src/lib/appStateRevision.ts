import type { AppState } from "@/types"

export function boardItemCount(state: AppState): number {
  let n = state.standaloneLinks.length
  for (const section of state.sections) n += 1 + section.links.length
  return n
}

export function readUpdatedAt(state: AppState): number {
  const t = state.updatedAt
  return typeof t === "number" && Number.isFinite(t) && t > 0 ? t : 0
}

/** Bump so this snapshot sorts after both wall clock and the previous stamp (clock skew). */
export function stampAppState(state: AppState, now = Date.now()): AppState {
  const prev = readUpdatedAt(state)
  return { ...state, updatedAt: Math.max(now, prev + 1) }
}

/** Empty unstamped blobs are treated as "sync not here yet" on a new device. */
export function isAuthoritativeSync(state: AppState | undefined): boolean {
  if (!state) return false
  return boardItemCount(state) > 0 || readUpdatedAt(state) > 0
}

/**
 * Whether `incoming` should replace `current`.
 *
 * hydrating: take the larger board so a first-run empty write cannot beat
 * a board that is still catching up from Chrome sync.
 * ready: last-write-wins by updatedAt; a blank board only wins if it is
 * strictly newer than a stamped populated board (user cleared).
 */
export function preferIncoming(
  incoming: AppState,
  current: AppState,
  phase: "hydrating" | "ready" = "ready"
): boolean {
  const inCount = boardItemCount(incoming)
  const curCount = boardItemCount(current)
  const inAt = readUpdatedAt(incoming)
  const curAt = readUpdatedAt(current)

  if (phase === "hydrating") {
    if (inCount !== curCount) return inCount > curCount
    if (inAt !== curAt) return inAt > curAt
    return true
  }

  if ((inCount === 0) !== (curCount === 0)) {
    const emptyAt = inCount === 0 ? inAt : curAt
    const fullAt = inCount === 0 ? curAt : inAt
    const emptyWins = fullAt > 0 && emptyAt > fullAt
    return inCount === 0 ? emptyWins : !emptyWins
  }

  if (inAt !== curAt) return inAt > curAt
  if (inCount !== curCount) return inCount > curCount
  return true
}
