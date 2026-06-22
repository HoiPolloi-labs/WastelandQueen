/**
 * Water-sort ("Reagent Sorting") puzzle model. A vial holds up to CAPACITY
 * colour layers, bottom→top. Each colour appears exactly CAPACITY times across
 * the board. A pour moves the top contiguous run of one colour from A to B if B
 * is empty or B's top matches and has room. Solved = every vial is empty or
 * full of a single colour.
 */
export const CAPACITY = 4

/** A vial: colour indices bottom→top. `[]` = empty. */
export type Vial = number[]
export type SortState = Vial[]
export interface Move {
  from: number
  to: number
}

/** Top contiguous same-colour run of a vial, or null if empty. */
export function topRun(vial: Vial): { color: number; count: number } | null {
  if (vial.length === 0) return null
  const color = vial[vial.length - 1]!
  let count = 1
  for (let i = vial.length - 2; i >= 0 && vial[i] === color; i--) count++
  return { color, count }
}

export function isVialDone(vial: Vial): boolean {
  if (vial.length === 0) return true
  if (vial.length !== CAPACITY) return false
  return vial.every((c) => c === vial[0])
}

export function isSolved(state: SortState): boolean {
  return state.every(isVialDone)
}

export function canPour(state: SortState, from: number, to: number): boolean {
  if (from === to) return false
  const a = state[from]
  const b = state[to]
  if (!a || !b) return false
  if (a.length === 0) return false
  if (b.length >= CAPACITY) return false
  // No point pouring a single-colour vial that's already as consolidated as it
  // can be into an empty vial (pure shuffle, no progress).
  if (b.length === 0 && a.length === topRun(a)!.count && a.length > 0 && isUniform(a)) {
    return false
  }
  if (b.length === 0) return true
  return a[a.length - 1] === b[b.length - 1]
}

function isUniform(vial: Vial): boolean {
  return vial.length > 0 && vial.every((c) => c === vial[0])
}

/** Apply a pour, returning a NEW state (inputs untouched). Assumes canPour. */
export function applyPour(state: SortState, from: number, to: number): SortState {
  const next = state.map((v) => v.slice())
  const a = next[from]!
  const b = next[to]!
  const run = topRun(a)!
  const movable = Math.min(run.count, CAPACITY - b.length)
  for (let i = 0; i < movable; i++) {
    b.push(a.pop()!)
  }
  return next
}

export function legalMoves(state: SortState): Move[] {
  const moves: Move[] = []
  for (let from = 0; from < state.length; from++) {
    for (let to = 0; to < state.length; to++) {
      if (canPour(state, from, to)) moves.push({ from, to })
    }
  }
  return moves
}

/**
 * Canonical key for the visited-set: vials are interchangeable, so sort their
 * string forms — collapses symmetric states and shrinks the search massively.
 */
export function serialize(state: SortState): string {
  return state
    .map((v) => v.join(','))
    .sort()
    .join('|')
}

/** Validation for the editor: every colour must appear ≤ CAPACITY times. */
export function colorOveruse(state: SortState, colorCount: number): number[] {
  const counts = new Array<number>(colorCount).fill(0)
  for (const v of state) for (const c of v) if (c >= 0 && c < colorCount) counts[c]!++
  return counts.flatMap((n, c) => (n > CAPACITY ? [c] : []))
}
