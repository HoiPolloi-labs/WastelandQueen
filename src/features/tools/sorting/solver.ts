import {
  type SortState,
  type Move,
  isSolved,
  isVialDone,
  legalMoves,
  applyPour,
  serialize,
  topRun,
  CAPACITY,
} from './state'

export type SolveResult =
  | { status: 'solved'; moves: Move[] }
  | { status: 'unsolvable' }
  | { status: 'too_complex' }

const DEFAULT_CAP = 200_000

/**
 * DFS with a canonical visited-set, returning the first full solution found
 * (any valid solution — not necessarily shortest). Move ordering prefers pours
 * that complete or empty a vial, which both prunes the tree and yields tidier
 * solutions. Bounded by `cap` visited states → `too_complex` if exceeded.
 */
export function solve(initial: SortState, cap = DEFAULT_CAP): SolveResult {
  if (isSolved(initial)) return { status: 'solved', moves: [] }

  const visited = new Set<string>()
  const path: Move[] = []
  let hitCap = false

  const score = (state: SortState, m: Move): number => {
    const next = applyPour(state, m.from, m.to)
    let s = 0
    if (isVialDone(next[m.to]!) && next[m.to]!.length === CAPACITY) s += 3 // completed a vial
    if (next[m.from]!.length === 0) s += 2 // emptied source
    const toTop = topRun(state[m.to]!)
    if (toTop) s += 1 // pour onto a matching colour (vs an empty vial)
    return s
  }

  const dfs = (state: SortState): boolean => {
    if (isSolved(state)) return true
    if (visited.size >= cap) {
      hitCap = true
      return false
    }
    const key = serialize(state)
    if (visited.has(key)) return false
    visited.add(key)

    const moves = legalMoves(state).sort((a, b) => score(state, b) - score(state, a))
    for (const m of moves) {
      path.push(m)
      if (dfs(applyPour(state, m.from, m.to))) return true
      path.pop()
    }
    return false
  }

  if (dfs(initial)) return { status: 'solved', moves: [...path] }
  return hitCap ? { status: 'too_complex' } : { status: 'unsolvable' }
}
