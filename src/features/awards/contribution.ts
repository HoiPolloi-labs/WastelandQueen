import type { Assignment, EventConfig, Signup } from '@/types/wk'

export interface AwardCandidate {
  signup: Signup
  earlyBonus: number
  attendedBonus: number
  captainBonus: number
  shiftBonus: number
  pointsBonus: number
  score: number
  captainCount: number
  shiftCount: number
  personalPoints: number
}

const W_ATTENDED = 30
const W_CAPTAIN = 25
const W_SHIFT = 10
const W_POINTS_DIVISOR = 100 // 10,000 personal points → 100 score

/**
 * Maps `submitted_at` to a 0–30 bonus depending on lead time before event start.
 * 7+ days early = 30, 1 day = ~5, after the event start = 0.
 */
function earlySignupBonus(submittedAt: string, startsAtUtc: string): number {
  const submitted = new Date(submittedAt).getTime()
  const starts = new Date(startsAtUtc).getTime()
  // CODE-REVIEW fix: guard against a bad/missing date (legacy row, manual
  // edit). Without this NaN propagated into the score and broke the sort.
  if (Number.isNaN(submitted) || Number.isNaN(starts)) return 0
  const hoursAhead = (starts - submitted) / 36e5
  if (hoursAhead <= 0) return 0
  const days = hoursAhead / 24
  return Math.min(30, Math.round(days * 4)) // 7.5 days → cap
}

export function computeAwardCandidates(
  signups: Signup[],
  assignments: Assignment[],
  event: EventConfig,
): AwardCandidate[] {
  return signups
    .map((s) => {
      const myAssignments = assignments.filter((a) => a.signup_id === s.id)
      const captainCount = myAssignments.filter((a) => a.is_captain).length
      const shiftCount = new Set(myAssignments.map((a) => a.shift)).size
      const personalPoints = s.kill_points + s.death_points + s.occupation_points

      const earlyBonus = earlySignupBonus(s.submitted_at, event.starts_at_utc)
      const attendedBonus = s.attended === true ? W_ATTENDED : 0
      const captainBonus = captainCount * W_CAPTAIN
      const shiftBonus = shiftCount * W_SHIFT
      const pointsBonus = personalPoints / W_POINTS_DIVISOR

      const score = earlyBonus + attendedBonus + captainBonus + shiftBonus + pointsBonus

      return {
        signup: s,
        earlyBonus,
        attendedBonus,
        captainBonus,
        shiftBonus,
        pointsBonus,
        score: Math.round(score),
        captainCount,
        shiftCount,
        personalPoints,
      }
    })
    .sort((a, b) => {
      // wk_points (the in-game "Aktuelle Pkte" total) is the authoritative
      // ranking when recorded. Players WITH a recorded total always rank above
      // those without — mixing the two scales (wk_points in the thousands vs.
      // the composite score in the hundreds) would otherwise be meaningless.
      // Among recorded players, sort by wk_points desc; everyone else falls
      // back to the composite score so the page works fine before any
      // wk_points are entered (and all existing scoring tests still hold).
      const aw = a.signup.wk_points
      const bw = b.signup.wk_points
      const aHas = aw != null
      const bHas = bw != null
      if (aHas !== bHas) return aHas ? -1 : 1
      if (aHas && bHas && aw !== bw) return bw - aw
      return b.score - a.score
    })
}
